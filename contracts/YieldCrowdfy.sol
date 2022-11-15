// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/external/IPool.AVEE.sol";
import "./interfaces/external/IPoolAddressesProvider.AVEE.sol";
import "./interfaces/external/IWeth.AAVE.sol";
import "./Utils.sol";

/**
 * @title Contract for all yield related functionalities in the crowdfy Protocol.
 *
 * Designed to be extended by the core Crowdfy contract
 *
 * @author Kevin Bravo (@_bravoK)
 *
 * @notice Allows the beneficiary or the owner of a crowdfy campaign to stake the founds collected during the campaign and gain interest.
 *
 * @dev Uses the AAVE protocol V3 API to stake and receive rewards
 *
 * The main functions of the contract can only be used if:
 *     - the campaign currency is ETH
 *     - The campaign is in Early Success or Success state.
 *
 * The user can stake as much as he/she wants from its campaign.
 *
 */
contract YieldCrowdfy is Utils {
    using SafeERC20 for IERC20;

    event yieldFarmingStarted(
        address _assetAddress,
        uint256 indexed _amountDeposited,
        address _campaignAddress
    );
    event yieldFarmingFinished(
        address _assetAddress,
        address campaignAddress,
        uint256 indexed _interestEarned
    );

    address public constant POOL_ADDRESSES_PROVIDER_ADDRESS =
        0xc4dCB5126a3AfEd129BC3668Ea19285A9f56D15D;
    address public constant WETH_GATEWAY_CONTRACT_ADDRES =
        0xd5B55D3Ed89FDa19124ceB5baB620328287b915d;

      /// Crowdfy: This function is only allowed when the campaign selected token is Eth.
      /// the current token is `_token`
      error OnlyEth(address _token);
      /// Crowdfy: Not enough money provided. You provide `_givem` but is expected to be > 0
      ///@param _given the amount of money the user provide
      error NotEnoughMoney(uint256 _given);
      /// YieldCrowdfy: the contract is not currently yielding, you have to deposit money first to be able to withdraw
      error isNotYielding();
    ///@notice Keeps track is the user is the user is yielding {true} or not {false}
    bool public isYielding;
    ///@notice keeps track of how much the user has supplied to stake
    uint256 public supplied;

    /**
     * @notice This function allows the owner or beneficiary of the campaign to deposit money in the AAVE V3 protocol
     * @param _assetAddress the address of the asset we want to provide to stake (ONLY ETH)
     * @param _campaignAddress the address of the campaign from where the money comes from
     * @param _amount how much money are going to be deposited.
     * @return bool
     * @dev Uses the depositETH function of the {IWETHGateway} contract of the AAVE V3 protocol.
     *
     * This converts the eth given to the contract in Weth and stakes it into the AAVE protocol.
     *
     * @custom:see
     *
     * This function can only be used when:
     * - the currency that the campaign is using is eth.
     * - the campaign is in early success or success state.
     * */

    function deposit(
        address _assetAddress,
        address _campaignAddress,
        uint256 _amount
    ) public payable returns (bool) {
        if(_amount == 0) revert NotEnoughMoney(_amount);
        if(!isEth(_assetAddress)) revert OnlyEth(_assetAddress);
        address lendingPool = getAAVELendingPool();
        IWETHGateway(WETH_GATEWAY_CONTRACT_ADDRES).depositETH{value: _amount}(
            lendingPool,
            _campaignAddress,
            0
        );
        emit yieldFarmingStarted(_assetAddress, _amount, _campaignAddress);
        supplied += _amount;
        isYielding = true;
        return true;
    }

    /**
     * @notice This function allows the owner or the beneficiary of the campaign to whitdraw all the money plus the interest that were gain during the stake
     *
     * @param _assetAddress the address of the asset we provided to stake
     * @param _campaignAddress the address of the campaign, where the money receive is going to go.
     * @return interestEarned the amount that were deposited to stake plus the interest earned
     * @dev This function can only be called if the user has previously stake money into the AAVE protocol.
     *
     * Uses the withdrawETH function of the {WETHGateway} contract of the AAVE V3 protocol.
     *
     * @custom:see
     *
     * Uses approve function of the {ERC20} token contract standard to allow the {WETHGateway} to move the founds
     * @custom:see
     *
     * Withdraws the total that were yielded plus the interest. (An improve could be let the user decide how much he/she wants withdraw)
     *
     * At the end of the execution restores the default values of {supplied} & {isYielding}
     * */
    function withdrawYield(address _assetAddress, address _campaignAddress)
        internal
        returns (uint256)
    {
        if(!isYielding) revert isNotYielding();
        address lendingPool = getAAVELendingPool();
        address wethAddress = IWETHGateway(WETH_GATEWAY_CONTRACT_ADDRES)
            .getWETHAddress();
        IERC20 aToken = IERC20(
            IPool(lendingPool).getReserveData(wethAddress).aTokenAddress
        );
        uint256 interestEarned = aToken.balanceOf(_campaignAddress);
        IERC20(address(aToken)).safeApprove(
            WETH_GATEWAY_CONTRACT_ADDRES,
            interestEarned
        );
        IWETHGateway(WETH_GATEWAY_CONTRACT_ADDRES).withdrawETH(
            lendingPool,
            type(uint256).max,
            _campaignAddress
        );
        emit yieldFarmingFinished(
            _assetAddress,
            _campaignAddress,
            interestEarned
        );
        supplied = 0;
        isYielding = false;
        return interestEarned;
    }

    /**
     * @notice This function allow us to have the most reccient version of the aave pool
     * @dev Pattern recommended by the AAVE protocol
     * @return lendingPool the address of the lending pool that the aave protocol is using rn
     * @custom:see
     */
    function getAAVELendingPool() internal view returns (address lendingPool) {
        lendingPool = IPoolAddressesProvider(POOL_ADDRESSES_PROVIDER_ADDRESS)
            .getPool();
    }

    /**
     * @notice Gets the total value that were yielded plus interest earned
     * @param _campaignAddress the address of the campaign we want to know how much has earned
     * @return the total value that were yielded plus interest earned
     */
    function getBalanceWithInterest(address _campaignAddress)
        external
        view
        returns (uint256)
    {
        address lendingPool = getAAVELendingPool();
        address wethAddress = IWETHGateway(WETH_GATEWAY_CONTRACT_ADDRES)
            .getWETHAddress();
        IERC20 aToken = IERC20(
            IPool(lendingPool).getReserveData(wethAddress).aTokenAddress
        );
        return aToken.balanceOf(_campaignAddress);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/external/IPool.AVEE.sol";
import "./interfaces/external/IPoolAddressesProvider.AVEE.sol";
import "./interfaces/external/IWeth.AAVE.sol";
import "./Utils.sol";


/** 
 * @notice Allows yield farming functionalities to the crowdfy protocol.
 * @dev uses the AAVE protocol API to stake tokens and receive rewards 
 */
contract YieldCrowdfy is Utils{
    using SafeERC20 for IERC20;

    event yieldFarmingStarted(address _assetAddress,  uint256 indexed _amountDeposited, address _campaignAddress);
    event yieldFarmingFinished(address _assetAddress, address campaignAddress, uint256 indexed _interestEarned);

    address public constant POOL_ADDRESSES_PROVIDER_ADDRESS = 0xc4dCB5126a3AfEd129BC3668Ea19285A9f56D15D;
    address public constant WETH_GATEWAY_CONTRACT_ADDRES = 0xd5B55D3Ed89FDa19124ceB5baB620328287b915d;
    
    bool public isYielding;
    uint256 public supplied;

    function deposit(
        address _assetAddress, 
        address _campaignAddress,
        uint256 _amount
    )  public payable returns (bool) {
        require(_amount > 0, "Not enough money");
        require(isEth(_assetAddress), "You can only transfer Eth");
        address lendingPool = getAAVELendingPool();
        IWETHGateway(WETH_GATEWAY_CONTRACT_ADDRES).depositETH{value:  _amount}(lendingPool ,_campaignAddress, 0);
        emit yieldFarmingStarted(_assetAddress, _amount, _campaignAddress);
        supplied += _amount;
        isYielding = true;
        return true;
    }

    function withdrawYield(address _assetAddress, address _campaignAddress) internal returns(uint256) {
        require(isYielding, "YieldFarming: you cannot withdraw if you are not yielding");
        address lendingPool = getAAVELendingPool();
        address wethAddress =  IWETHGateway(WETH_GATEWAY_CONTRACT_ADDRES).getWETHAddress();
        IERC20 aToken = IERC20(IPool(lendingPool).getReserveData(wethAddress).aTokenAddress);
        uint256 interestEarned = aToken.balanceOf(_campaignAddress);
        IERC20(address(aToken)).safeApprove(WETH_GATEWAY_CONTRACT_ADDRES, interestEarned);
        IWETHGateway(WETH_GATEWAY_CONTRACT_ADDRES).withdrawETH(lendingPool, type(uint).max, _campaignAddress);
        emit yieldFarmingFinished(_assetAddress, _campaignAddress, interestEarned);
        supplied = 0;
        isYielding = false;
        return interestEarned;
    }

    function getAAVELendingPool() internal view returns(address lendingPool){
        lendingPool = IPoolAddressesProvider(POOL_ADDRESSES_PROVIDER_ADDRESS).getPool();
    }

    function getBalanceWithInterest(
        address _campaignAddress
    ) external view returns(uint256) {
        address lendingPool = getAAVELendingPool();
        address wethAddress =  IWETHGateway(WETH_GATEWAY_CONTRACT_ADDRES).getWETHAddress();
        IERC20 aToken = IERC20(IPool(lendingPool).getReserveData(wethAddress).aTokenAddress);
        return aToken.balanceOf(_campaignAddress);
    }

}
// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/external/IPool.AVEE.sol";
import "./interfaces/external/IPoolAddressesProvider.AVEE.sol";
import "./interfaces/external/IAToken.AAVE.sol";

contract YieldCrowdfy {
    using SafeERC20 for IERC20;

    address public constant PoolAddressesProviderAddress = 0xc4dCB5126a3AfEd129BC3668Ea19285A9f56D15D;

    address public constant ATokenAddress = 0xF2EBFA003f04f38Fc606a37ab8D1c015c015725c;

    function deposit(
        address _assetAddress, 
        uint256 _amount, 
        address _campaignAddress
    ) external returns (bool) {
        address lendingPool = getAAVELendingPool();
        IERC20(_assetAddress).safeApprove(lendingPool, _amount);
        IPool(lendingPool).supply(_assetAddress, amount,  _campaignAddress ,0);
        return true;
    }

    function withdraw(address _assetAddress, address _campaignAddress) external {
        address lendingPool = getAAVELendingPool();
        IPool(lendingPool).withdraw(_assetAddress, type(uint256).max, _campaignAddress);
    }

    function getAAVELendingPool() internal view returns(address lendingPool){
        lendingPool = IPoolAddressesProvider(PoolAddressesProviderAddress).getPool();
    }

    function getBalanceWithInterest(
        address _campaignAddress
    ) external view returns(uint256) {
        return IAToken(0xF2EBFA003f04f38Fc606a37ab8D1c015c015725c).balanceOf(_campaignAddress);
    }

    function getBalanceWithoutInterest(
        address _campaignAddress      
    ) external view returns(uint256) {
        return IAToken(0xF2EBFA003f04f38Fc606a37ab8D1c015c015725c).principalBalanceOf(_campaignAddress);
    }
}
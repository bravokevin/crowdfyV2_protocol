// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

interface IAToken {
    function balanceOf(address _user) external view returns(uint256);
    function principalBalanceOf(address _user)  external view returns(uint256);
}
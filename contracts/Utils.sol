// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

abstract contract Utils {
        function isEth(address token) public virtual pure returns(bool _isEth) {
        _isEth = token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE || token == address(0) ? true : false;
    }
}
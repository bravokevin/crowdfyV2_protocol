// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract CrwodfyTokenn is ERC20, ERC20Permit, ERC20Votes {

    //to allow anyone to be able to mint some tokens to use as test in the governance
    mapping (address  => bool) hasMinted;

    constructor() ERC20("CrwodfyToken", "CWYT") ERC20Permit("CrwodfyToken") {}

    // The functions below are overrides required by Solidity.
    
    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        require(
            !hasMinted[to] && 
            totalSupply() < 10000000 * 10 **decimals()
         );
        super._mint(to, 100 * 10 ** decimals());
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}
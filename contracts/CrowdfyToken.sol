// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CrowdfyToken is ERC20Votes, Ownable {
    uint256 public maxSupply = 10000 * 10**decimals();

    error MaxSupplyPassed();
    constructor() ERC20("CrowdfyToken", "CFYT") ERC20Permit("CrowdfyToken") {}

    // The following functions are overrides required by Solidity.

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20Votes)
        onlyOwner
    {
        super._burn(account, amount);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        if(totalSupply() >= maxSupply) revert MaxSupplyPassed();
        _mint(to, amount * 10**decimals());
    }
}

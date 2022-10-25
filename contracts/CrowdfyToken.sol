// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CrowdfyToken is ERC20Votes, Ownable {
    uint256 public maxSuply = 10000 * 10**decimals();

    constructor() ERC20("CrowdfyToken", "CFYT") ERC20Permit("CrowdfyToken") {
        _mint(msg.sender, maxSuply / 5);
    }

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
    {
        super._burn(account, amount);
    }

    function mint(address to, uint256 amount) external {
        require(totalSupply() <= maxSuply);
        _mint(to, amount);
    }
}

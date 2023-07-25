// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./Quest.sol";
import "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import "@opengsn/contracts/src/forwarder/Forwarder.sol";

contract QuestV2 is Quest, ERC2771ContextUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(Forwarder forwarder) Quest() ERC2771ContextUpgradeable(address(forwarder)) {}

    function _msgSender()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address sender)
    {
        return ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771ContextUpgradeable) returns (bytes calldata) {
        return ERC2771ContextUpgradeable._msgData();
    }
}

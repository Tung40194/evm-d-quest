// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../Quest.sol";

contract QuestV2 is Quest {
    function checkUpgrade() public pure returns (bool isUpgraded) {
        isUpgraded = true;
    }
}

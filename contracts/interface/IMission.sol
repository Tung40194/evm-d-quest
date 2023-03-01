// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;
import "../lib/DQuestStructLib.sol";

/// @title An interface for a Mission contract
/// @notice Mission contract is used to verify certain mission logic
interface IMission {
    /// @notice validate mission
    /// @param _quester The quester to be validate
    /// @param _node The node that contains information for this mission validation
    /// @return isComplete Returns validation result
    function validateMission(
        address _quester,
        DQuestStructLib.MissionNode calldata _node
    ) external returns (bool isComplete);
}

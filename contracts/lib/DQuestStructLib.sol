// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

library DQuestStrucLib {
    /// @dev Defines the possible types of operators for a mission node.
    /// States:
    /// - And = All child nodes must evaluate to true for this node to be true.
    /// - Or = At least one child node must evaluate to true for this node to be true.
    enum OperatorType {
        And,
        Or
    }

    /// @notice MissionNode stands for a mission parameters
    /// @dev MisisonNode can be an operator or a mission with parameters defined inside of Slot0/Slot1 fields
    /// @param nodeId The node ID inside of AND/OR tree
    /// @param isMission Is the node a mission or an operator
    /// @param missionHandlerAddress The address of MissionHandler contract to validate the mission with given parameters, equals 0x0 if isMission = false
    /// @param operatorType The operator type = And/Or if isMission = false
    /// @param leftNode Left side node of this Node
    /// @param rightNode Right side node of this Node
    /// @param tokenAddress Address of the token contract to validate
    /// @param amount Amount to validate
    /// @param blockHeight Block height to validate
    /// @param snapshotId Snapshot's poll ID to validate
    /// @param tweetId Twitter's tweet ID to validate
    struct MissionNode {
        uint256 nodeId;
        bool isMission;
        address missionHandlerAddress;
        OperatorType operatorType;
        uint256 leftNode;
        uint256 rightNode;
        address tokenAddress;
        uint256 amount;
        uint256 blockHeight;
        uint256 snapshotId;
        string tweetId;
    }

    // TODO Define clearer / To be discuss in https://git.baikal.io/can/can-evm-dquest/-/issues/9
    struct Outcome {
        address tokenAddress;
        uint256 tokenAmount;
    }
}

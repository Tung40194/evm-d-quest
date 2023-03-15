// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

library DQuestStructLib {
    /// @dev Defines the possible types of operators for a mission node.
    /// States:
    /// - And = All child nodes must evaluate to true for this node to be true.
    /// - Or = At least one child node must evaluate to true for this node to be true.
    enum OperatorType {
        AND,
        OR
    }

    /// @dev Defines the possible types of Tweet for a Twitter mission.
    /// States:
    /// - None = Not a Twitter mission.
    /// - Like = Like Tweet mission.
    /// - Share = Share Tweet mission.
    /// - Retweet = Retweet Tweet mission.
    enum TweetAction {
        Like,
        Share,
        Retweet
    }

    /// @notice MissionNode stands for a mission parameters
    /// @dev MisisonNode can be an operator or a mission with parameters defined inside of Slot0/Slot1 fields
    /// @param id The index of the node in the array of missionNodeFormula.
    /// @param isMission Is the node a mission or an operator
    /// @param missionHandlerAddress The address of MissionHandler contract to validate the mission with given parameters, equals 0x0 if isMission = false
    /// @param oracleAddress The address of the oracle for the mission handler (off chain mission handler)
    /// @param operatorType The operator type = And/Or if isMission = false
    /// @param leftNode Left side node of this Node
    /// @param rightNode Right side node of this Node
    /// @param data An array of bytes to represent arbitrary data for mission handler
    struct MissionNode {
        uint256 id;
        bool isMission;
        address missionHandlerAddress;
        address oracleAddress;
        OperatorType operatorType;
        uint256 leftNode;
        uint256 rightNode;
        bytes[] data;
    }

    /// @notice Outcome stands for each Outcome Reward for this Quest.
    /// @param tokenAddress The token address reward for this Quest.
    /// @param functionSelector The functionSelector to execute the Outcome.
    /// @param data The first Outcome data formed for this Quest in case of token reward.
    /// @param nativeAmount native reward for each Quester if successfully completed the Quest.
    /// @param isNative To define if this Outcome reward is native coin.
    /// @param totalReward The total reward for this Quest.
    /// @param isLimited identify if this Outcome has limited reward amount.
    struct Outcome {
        address tokenAddress;
        bytes4 functionSelector;
        bytes data;
        bool isNative;
        uint256 nativeAmount;
        bool isLimitedReward;
        uint256 totalReward;
    }
}

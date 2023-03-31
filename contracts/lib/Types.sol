// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

library Types {
    /// @dev Defines the possible types of operators for a mission node.
    /// States:
    /// - And = All child nodes must evaluate to true for this node to be true.
    /// - Or = At least one child node must evaluate to true for this node to be true.
    enum OperatorType {
        AND,
        OR
    }

    /// @notice MissionNode stands for a mission parameters
    /// @dev MisisonNode can be an operator or a mission with parameters defined inside of Slot0/Slot1 fields
    /// @param id The index of the node in the array of missionNodeFormula.
    /// @param isMission Is the node a mission or an operator
    /// @param missionHandlerAddress The address of MissionHandler contract to validate the mission with given parameters
    /// @param operatorType The operator type = And/Or if isMission = false
    /// @param leftNode Left side node of this Node
    /// @param rightNode Right side node of this Node
    /// @param data An array of bytes to represent arbitrary data for mission handler
    struct MissionNode {
        uint256 id;
        bool isMission;
        address missionHandlerAddress;
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

// A helper in validating input mission formula
library mNodeId2Iterator {
    struct ResetableId2iterator {
        mapping(uint256 => mapping(uint256 => uint256)) rmap;
        uint256 rst;
    }

    function _setIterators(ResetableId2iterator storage id2itr, Types.MissionNode[] memory nodes) internal {
        id2itr.rst++;
        for (uint256 index = 0; index < nodes.length; index++) {
            id2itr.rmap[id2itr.rst][nodes[index].id] = index;
        }
    }

    function _getIterator(ResetableId2iterator storage id2itr, uint256 nodeId) internal view returns (uint256) {
        return id2itr.rmap[id2itr.rst][nodeId];
    }
}


// An improvement for mNodeId2Iterator but standalone to follow upgradeable rules
library mNodeId2IteratorV2 {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    struct Id2Iterator {
        mapping(uint256 => uint256) map;
        EnumerableSetUpgradeable.UintSet keys;
    }

    struct ResetableId2iterator {
        mapping(uint256 => Id2Iterator) rmap;
        uint256 rst;
    }

    function _setIterators(ResetableId2iterator storage id2itr, Types.MissionNode[] memory nodes) internal {
        id2itr.rst++;
        for (uint256 index = 0; index < nodes.length; index++) {
            id2itr.rmap[id2itr.rst].map[nodes[index].id] = index;
            id2itr.rmap[id2itr.rst].keys.add(nodes[index].id);
        }
    }

    function _getIterator(ResetableId2iterator storage id2itr, uint256 nodeId) internal view returns (uint256) {
        return id2itr.rmap[id2itr.rst].map[nodeId];
    }

    function _exist(ResetableId2iterator storage id2itr, uint256 nodeId) internal view returns (bool) {
        return id2itr.rmap[id2itr.rst].keys.contains(nodeId);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

// Error Codes:
// MF1 - repetitive id
// MF2 - node(s) missing
// MF3 - tree loops

import "./DQuestStructLib.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title MissionFormula
 * @dev This library defines data structures and functions related to mission formulas.
 */
library MissionFormula {
    // Use EnumerableSet to manage node ids
    using EnumerableSet for EnumerableSet.UintSet;

    /**
     * @dev Defines a formula data structure which stores mission nodes in a mapping.
     * @param _values Mapping to store mission nodes.
     * @param _keys EnumerableSet to manage node ids.
     */
    struct Formula {
        mapping(uint256 => DQuestStructLib.MissionNode) _values;
        EnumerableSet.UintSet _keys;
    }

    /**
     * @dev Defines an efficiently resetable formula data structure which stores formulas in a mapping.
     * @param erf Mapping to store formulas.
     * @param rstPtr Pointer to the current formula in the mapping.
     */
    struct efficientlyResetableFormula {
        mapping(uint256 => Formula) erf;
        uint256 rstPtr;
    }

    // check if nodeid is the root of the tree
    function _isRoot(efficientlyResetableFormula storage f, uint256 nodeId) private view returns (bool) {
        require(f.erf[f.rstPtr]._keys.contains(nodeId), "Null node");
        Formula storage formula = f.erf[f.rstPtr];
        uint256 len = formula._keys.length();
        for (uint256 index = 0; index < len; index++) {
            uint256 key = formula._keys.at(index);
            DQuestStructLib.MissionNode memory node = formula._values[key];
            // if it is node to be checked, continue
            if (node.id == nodeId) continue;
            // if node is a child node, node is not a root node
            if (node.leftNode == nodeId || node.rightNode == nodeId) return false;
        }
        return true;
    }

    /**
     * @dev Adds nodes to the given formula and resets it.
     * @param f Formula to add nodes to.
     * @param nodes Array of mission nodes to add to the formula.
     * @return Boolean indicating success.
     */
    function _set(
        efficientlyResetableFormula storage f,
        DQuestStructLib.MissionNode[] memory nodes
    ) internal returns (bool) {
        _reset(f);
        if (nodes.length != 0) {
            for (uint256 idx = 0; idx < nodes.length; idx++) {
                f.erf[f.rstPtr]._values[nodes[idx].id] = nodes[idx];
                assert(f.erf[f.rstPtr]._keys.add(nodes[idx].id));
            }
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Resets the given formula by incrementing the pointer to the next formula in the mapping.
     * @param f Formula to reset.
     */
    function _reset(efficientlyResetableFormula storage f) private {
        // inc pointer to reset mapping; omit id #0
        f.rstPtr++;
    }

    /**
     * @dev Returns the mission node with the given id from the given formula.
     * @param f Formula to get mission node from.
     * @param nodeId Id of the mission node to get. Must exist.
     * @return Mission node with the given id.
     */
    function _getNode(
        efficientlyResetableFormula storage f,
        uint256 nodeId
    ) internal view returns (DQuestStructLib.MissionNode memory) {
        require(f.erf[f.rstPtr]._keys.contains(nodeId), "Null node");
        return f.erf[f.rstPtr]._values[nodeId];
    }
}

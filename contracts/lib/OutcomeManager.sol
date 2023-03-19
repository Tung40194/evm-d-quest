// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./Types.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

/**
 * @title OutcomeManager
 * @dev This library defines data structures and functions related to outcome for quest.
 */
library OutcomeManager {
    // Use EnumerableSetUpgradeable to manage node ids
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Defines a outcomes data structure which stores each outcome in a mapping.
     * @param _values Mapping to store outcome.
     * @param _keys EnumerableSetUpgradeable to manage outcome ids.
     */
    struct Outcomes {
        mapping(uint256 => Types.Outcome) _values;
        EnumerableSetUpgradeable.UintSet _keys;
    }

    /**
     * @dev Defines an efficiently resetable outcomes data structure which stores formulas in a mapping.
     * @param ero Mapping to store outcomes.
     * @param outPtr Pointer to the current formula in the mapping.
     */
    struct efficientlyResetableOutcome {
        mapping(uint256 => Outcomes) ero;
        uint256 outPtr;
    }

    /**
     * @dev Adds outcome to the given efficientlyResetableOutcome and resets it.
     * @param o efficientlyResetableOutcome to add outcome to.
     * @param outcomes Array of outcomes.
     * @return Boolean indicating success.
     */
    function _set(efficientlyResetableOutcome storage o, Types.Outcome[] memory outcomes) internal returns (bool) {
        _reset(o);
        if (outcomes.length != 0) {
            for (uint256 idx = 0; idx < outcomes.length; idx++) {
                o.ero[o.outPtr]._values[idx] = outcomes[idx];
                // outcome index(in the array) is the outcomeId
                assert(o.ero[o.outPtr]._keys.add(idx));
            }
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Returns the outcome with the given id from the given efficientlyResetableOutcome.
     * @param o efficientlyResetableOutcome to get outcome from.
     * @param outcomeId Id of the outcome to get. Must exist.
     * @return Outcome with the given id.
     */
    function _getOutcome(
        efficientlyResetableOutcome storage o,
        uint256 outcomeId
    ) internal view returns (Types.Outcome memory) {
        require(o.ero[o.outPtr]._keys.contains(outcomeId), "Null Outcome");
        return o.ero[o.outPtr]._values[outcomeId];
    }

    /**
     * @dev Resets the given efficientlyResetableOutcome by incrementing the pointer to the next Outcome in the mapping.
     * @param o Outcome to reset.
     */
    function _reset(efficientlyResetableOutcome storage o) private {
        // inc pointer to reset mapping; omit id #0
        o.outPtr++;
    }

    /**
     * @dev Replace the current outcome with the new one for the given id in efficientlyResetableOutcome.
     * @param o efficientlyResetableOutcome to replace outcome to.
     * @param outcomeId Id of the outcome to replace. Must exist.
     */
    function _replace(efficientlyResetableOutcome storage o, uint256 outcomeId, Types.Outcome memory outcome) internal {
        require(o.ero[o.outPtr]._keys.contains(outcomeId), "Null Outcome");
        o.ero[o.outPtr]._values[outcomeId] = outcome;
    }

    /**
     * @dev Returns the outcome length of the given efficientlyResetableOutcome.
     * @param o efficientlyResetableOutcome to get length from.
     * @return outcomeLength with the given efficientlyResetableOutcome.
     */
    function _length(efficientlyResetableOutcome storage o) internal view returns (uint256) {
        return EnumerableSetUpgradeable.length(o.ero[o.outPtr]._keys);
    }
}

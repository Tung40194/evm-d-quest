// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./DQuestStructLib.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// basically missionformula but featured with quick deletion/reset

library MissionFormula {
    using EnumerableSet for EnumerableSet.UintSet;

    // formula but no efficient reset feature
    struct Formula {
        mapping(uint256 => DQuestStructLib.MissionNode) _values;
        // manage node ids
        EnumerableSet.UintSet _keys;
    }

    // formula but featured with efficient reset
    struct efficientlyResetableFormula {
        mapping(uint256 => Formula) erf;
        uint256 rstPtr;
    }

    function _set(
        efficientlyResetableFormula storage f,
        DQuestStructLib.MissionNode[] memory nodes
    ) internal returns(bool) {
        _reset(f);
        if (nodes.length != 0){
            for(uint256 idx = 0; idx < nodes.length; idx ++) {
                f.erf[f.rstPtr]._values[idx] = nodes[idx];
                // node index(in the array) is the nodeId
                assert(f.erf[f.rstPtr]._keys.add(idx));
            }
            return true;
        } else {
            return false;
        }
    }
    
    function _getNode(
        efficientlyResetableFormula storage f,
        uint256 nodeId
    ) internal view returns(DQuestStructLib.MissionNode memory) {
        require(f.erf[f.rstPtr]._keys.contains(nodeId), "Null mission");
        return f.erf[f.rstPtr]._values[nodeId];
    }

    function _reset(efficientlyResetableFormula storage f) private {
        // inc pointer to reset mapping; omit id #0
        f.rstPtr ++;
    }
}

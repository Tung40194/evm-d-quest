// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./DQuestStructLib.sol";

library mNodeId2Iterator {
    struct ResetableId2iterator {
        mapping(uint256 => mapping(uint256 => uint256)) rmap;
        uint256 rst;
    }

    function _setIterators(ResetableId2iterator storage id2itr, DQuestStructLib.MissionNode[] memory nodes) internal {
        id2itr.rst++;
        for (uint256 index = 0; index < nodes.length; index++) {
            id2itr.rmap[id2itr.rst][nodes[index].id] = index;
        }
    }

    function _getIterator(ResetableId2iterator storage id2itr, uint256 nodeId) internal view returns (uint256) {
        return id2itr.rmap[id2itr.rst][nodeId];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ISBT.sol";
import "./ITwitterMission.sol";

/* solhint-disable */
contract SimpleQuest is Context {
    constructor() {}

    // Quest model
    struct Quest {
        address creator;
        address rewardBadge;
        mapping(address => Player) players;
        address[] missions;
    }

    struct Player {
        string playerId;
        bool win;
    }

    // QuestId => Quests
    mapping(string => Quest) public quests;

    // Events
    event QuestCreated(address badge, string questId);
    event QuestCompleted(address badge, string questId, address winner);

    // Creates a new quest
    function createQuest(address badge, string calldata questId, address[] memory missions) external {
        quests[questId].creator = _msgSender();
        quests[questId].rewardBadge = badge;
        quests[questId].missions = missions;

        // Emit event
        emit QuestCreated(badge, questId);
    }

    // playID : social ID. ex: twitter ID
    function registerPlayer(string calldata questId, string calldata playerId) external {
        quests[questId].players[_msgSender()].playerId = playerId;
    }

    // Once MyQuest is done, completeQuest will be called
    function completeQuest(string calldata questId, address winner) external onlyQuestOperator(questId) {
        // check all missions completed
        string memory playerId = quests[questId].players[winner].playerId;
        bool isCompletedMisssions = true;
        for (uint256 i = 0; i < quests[questId].missions.length; i++) {
            ITwitterMission mission = ITwitterMission(quests[questId].missions[i]);
            string memory playerStatus = mission.statusOf(playerId);
            isCompletedMisssions =
                isCompletedMisssions &&
                (keccak256(abi.encodePacked(playerStatus)) == keccak256(abi.encodePacked("completed")));
        }
        require(isCompletedMisssions, "mission not completed");

        quests[questId].players[winner].win = isCompletedMisssions;
        emit QuestCompleted(quests[questId].rewardBadge, questId, winner);

        // reward to winner
        address[] memory winners = new address[](1);
        winners[0] = winner;
        ISBT sbt = ISBT(quests[questId].rewardBadge);
        sbt.mint(winners, 0);
    }

    modifier onlyQuestOperator(string calldata questId) {
        // require(_isQuestOperator(_msgSender()), "Restricted to operators");
        _;
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./Quest.sol";
import "./lib/Beacon.sol";
import "./interface/IDQuest.sol";

contract DQuest is IDQuest, Initializable, OwnableUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /// @notice emit when a new proxy is created
    event QuestCreated(
        address proxyAddress,
        address owner,
        Types.MissionNode[] nodes,
        Types.Outcome[] outcomes,
        uint256 startTime,
        uint256 endTime
    );

    Beacon internal beacon;
    //TODO improve storage for quests/proxies and adminQuests
    // managing all quest/proxies addresses
    EnumerableSetUpgradeable.AddressSet private quests;
    //mapping user address to his created quests addresses
    mapping(address => EnumerableSetUpgradeable.AddressSet) private adminQuests;

    // prettier-ignore
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev proxy initializer
     */
    function initialize(address implContract) external virtual initializer {
        beacon = new Beacon(implContract);
        __Ownable_init();
    }

    function createQuest(
        Types.MissionNode[] memory nodes,
        Types.Outcome[] memory outcomes,
        uint256 startTime,
        uint256 endTime
    ) external virtual override {
        BeaconProxy quest = new BeaconProxy(
            address(beacon),
            abi.encodeWithSelector(Quest.init.selector, msg.sender, nodes, outcomes, startTime, endTime)
        );
        quests.add(address(quest));
        adminQuests[msg.sender].add(address(quest));
        emit QuestCreated(address(quest), msg.sender, nodes, outcomes, startTime, endTime);
    }

    function getImplementation() external view virtual override returns (address) {
        return beacon.implementation();
    }

    function getBeacon() external view virtual override returns (address) {
        return address(beacon);
    }

    function getQuest(uint256 index) external view virtual override returns (address) {
        return quests.at(index);
    }

    function getQuestCount() external view virtual override returns (uint256) {
        return quests.length();
    }

    function upgradeQuests(address implContract) external virtual override onlyOwner {
        beacon.updateContract(implContract);
    }

    function isQuest(address contractAddr) external view virtual override returns (bool) {
        return (quests.contains(contractAddr));
    }

    function getAllQuests() external view virtual override returns (address[] memory) {
        return quests.values();
    }

    function getQuests(address admin) external view virtual override returns (address[] memory) {
        return adminQuests[admin].values();
    }
}

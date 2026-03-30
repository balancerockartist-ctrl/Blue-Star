// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title GLSLogistics
 * @author Henry Howard Kennemore III — Blue-Star / G.O.S.
 * @notice Godworld Logistics Systems (G.L.S.) on-chain registry.
 *         Records item supply/demand data collected from QR Store scans and
 *         exposes it for the quantum economics engine to consume.
 */
contract GLSLogistics {
    // ─────────────────────── Events ───────────────────────

    event ItemRegistered(bytes32 indexed itemId, string category, string region, uint256 timestamp);
    event SupplyUpdated(bytes32 indexed itemId, uint256 newSupply, uint256 timestamp);
    event DemandUpdated(bytes32 indexed itemId, uint256 newDemand, uint256 timestamp);

    // ─────────────────────── Structs ──────────────────────

    struct LogisticsRecord {
        bytes32 itemId;
        string  name;
        string  category;
        string  region;
        uint256 supply;        // units available
        uint256 demand;        // scan/purchase requests
        uint256 estimatedValue; // in credit token smallest units
        string  metadataURI;
        uint256 registeredAt;
        bool    exists;
    }

    // ─────────────────────── State ────────────────────────

    address public owner;

    mapping(bytes32 => LogisticsRecord) public records;
    bytes32[] public itemIds;

    mapping(address => bool) public operators;

    // ─────────────────────── Modifiers ────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "GLS: not owner");
        _;
    }

    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner, "GLS: not operator");
        _;
    }

    // ─────────────────────── Constructor ──────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────── Functions ────────────────────

    /**
     * @notice Register a new item in the G.L.S. registry.
     */
    function registerItem(
        bytes32        itemId,
        string calldata name,
        string calldata category,
        string calldata region,
        uint256         initialSupply,
        uint256         estimatedValue,
        string calldata metadataURI
    ) external onlyOperator {
        require(!records[itemId].exists, "GLS: item already registered");

        records[itemId] = LogisticsRecord({
            itemId:         itemId,
            name:           name,
            category:       category,
            region:         region,
            supply:         initialSupply,
            demand:         0,
            estimatedValue: estimatedValue,
            metadataURI:    metadataURI,
            registeredAt:   block.timestamp,
            exists:         true
        });

        itemIds.push(itemId);

        emit ItemRegistered(itemId, category, region, block.timestamp);
    }

    /**
     * @notice Update supply for an existing item.
     */
    function updateSupply(bytes32 itemId, uint256 newSupply) external onlyOperator {
        require(records[itemId].exists, "GLS: item not found");
        records[itemId].supply = newSupply;
        emit SupplyUpdated(itemId, newSupply, block.timestamp);
    }

    /**
     * @notice Increment demand counter for an item (called on each scan/purchase).
     */
    function incrementDemand(bytes32 itemId) external onlyOperator {
        require(records[itemId].exists, "GLS: item not found");
        records[itemId].demand += 1;
        emit DemandUpdated(itemId, records[itemId].demand, block.timestamp);
    }

    /**
     * @notice Return total number of registered items.
     */
    function totalItems() external view returns (uint256) {
        return itemIds.length;
    }

    // ─────────────────────── Admin ────────────────────────

    function addOperator(address op) external onlyOwner {
        operators[op] = true;
    }

    function removeOperator(address op) external onlyOwner {
        operators[op] = false;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "GLS: zero address");
        owner = newOwner;
    }
}

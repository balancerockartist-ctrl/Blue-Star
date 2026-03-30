// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title QRStore
 * @author Henry Howard Kennemore III — Blue-Star / G.O.S.
 * @notice Core contract for the QR Store ecosystem.
 *         Records item scans, issues credits, and stores Google-Lens metadata
 *         references that feed the G.L.S. logistics chain.
 */
contract QRStore {
    // ─────────────────────── Events ───────────────────────

    /// @notice Emitted when a new item is registered via QR scan.
    event ItemScanned(
        bytes32 indexed itemId,
        address indexed recipient,
        uint256 creditAmount,
        string  metadataURI,
        uint256 timestamp
    );

    /// @notice Emitted when a tip is recorded against a transaction.
    event TipRecorded(
        bytes32 indexed transactionId,
        address indexed tipper,
        uint256 tipAmount,
        uint256 timestamp
    );

    // ─────────────────────── State ────────────────────────

    address public owner;

    struct ScanRecord {
        bytes32 itemId;
        address recipient;
        uint256 creditAmount;
        uint256 tipAmount;
        string  metadataURI;   // IPFS / Arweave URI for Google-Lens data
        uint256 timestamp;
        bool    exists;
    }

    /// transactionId => ScanRecord
    mapping(bytes32 => ScanRecord) public scanRecords;

    /// itemId => total credits issued
    mapping(bytes32 => uint256) public totalCreditsPerItem;

    // ─────────────────────── Modifiers ────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "QRStore: caller is not owner");
        _;
    }

    // ─────────────────────── Constructor ──────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────── Functions ────────────────────

    /**
     * @notice Record a QR scan and issue a credit to the recipient.
     * @param transactionId Unique identifier for this scan transaction.
     * @param itemId        Identifier of the scanned item.
     * @param recipient     Wallet address receiving the credit.
     * @param creditAmount  Credit value in the platform token's smallest unit.
     * @param metadataURI   URI pointing to the stored Google-Lens scan data.
     */
    function recordScan(
        bytes32 transactionId,
        bytes32 itemId,
        address recipient,
        uint256 creditAmount,
        string  calldata metadataURI
    ) external onlyOwner {
        require(!scanRecords[transactionId].exists, "QRStore: transaction already exists");
        require(recipient != address(0), "QRStore: invalid recipient");

        scanRecords[transactionId] = ScanRecord({
            itemId:       itemId,
            recipient:    recipient,
            creditAmount: creditAmount,
            tipAmount:    0,
            metadataURI:  metadataURI,
            timestamp:    block.timestamp,
            exists:       true
        });

        totalCreditsPerItem[itemId] += creditAmount;

        emit ItemScanned(itemId, recipient, creditAmount, metadataURI, block.timestamp);
    }

    /**
     * @notice Append a tip to an existing scan transaction.
     * @param transactionId The scan transaction to tip against.
     * @param tipper        Address of the tipper.
     * @param tipAmount     Tip value in the platform token's smallest unit.
     */
    function recordTip(
        bytes32 transactionId,
        address tipper,
        uint256 tipAmount
    ) external onlyOwner {
        require(scanRecords[transactionId].exists, "QRStore: transaction not found");
        require(tipAmount > 0, "QRStore: tip must be > 0");

        scanRecords[transactionId].tipAmount += tipAmount;

        emit TipRecorded(transactionId, tipper, tipAmount, block.timestamp);
    }

    /**
     * @notice Transfer contract ownership.
     * @param newOwner Address of the new owner.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "QRStore: zero address");
        owner = newOwner;
    }
}

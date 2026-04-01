// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

/**
 * @title QRStore
 * @author Henry Howard Kennemore III — GodWorld.org
 * @notice Core smart contract for the QR Store© platform.
 *         Users scan a QR code for an item, receive a credit,
 *         and may optionally tip the seller — all on-chain.
 * @dev Deploy to Ethereum Sepolia for testnet verification before mainnet.
 *      CC0 1.0 Universal public domain dedication.
 */
contract QRStore {
    // ─── Structs ────────────────────────────────────────────────────────────

    struct ItemRecord {
        bytes32 qrHash;        // keccak256 of QR code payload
        address seller;        // wallet that registered the item
        string  metadataURI;   // IPFS / Arweave URI for Google Lens data
        uint256 creditAmount;  // wei value of the issued credit
        uint256 scannedAt;     // block.timestamp when first scanned
        bool    exists;
    }

    // ─── State ──────────────────────────────────────────────────────────────

    address public immutable owner;

    /// @dev qrHash => ItemRecord
    mapping(bytes32 => ItemRecord) private _items;

    /// @dev buyer => cumulative credits received (wei)
    mapping(address => uint256) public creditBalance;

    // ─── Events ─────────────────────────────────────────────────────────────

    event ItemScanned(
        bytes32 indexed qrHash,
        address indexed seller,
        string  metadataURI,
        uint256 creditAmount,
        uint256 timestamp
    );

    event CreditIssued(
        bytes32 indexed qrHash,
        address indexed buyer,
        uint256 amount
    );

    event TipSent(
        bytes32 indexed qrHash,
        address indexed buyer,
        address indexed seller,
        uint256 amount
    );

    // ─── Errors ─────────────────────────────────────────────────────────────

    error ItemAlreadyRegistered(bytes32 qrHash);
    error ItemNotFound(bytes32 qrHash);
    error InsufficientCredit(uint256 available, uint256 required);
    error TipExceedsValue(uint256 sent, uint256 maxTip);
    error ZeroTipAmount();
    error ZeroCreditAmount();
    error TransferFailed();

    // ─── Modifiers ──────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "QRStore: caller is not owner");
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─── External functions ─────────────────────────────────────────────────

    /**
     * @notice Register an item on-chain and set its credit value.
     * @param qrHash       keccak256 hash of the QR code payload (unique item ID).
     * @param metadataURI  IPFS/Arweave URI storing Google Lens image + description.
     * @param creditAmount Value (in wei) that will be credited to the next buyer.
     */
    function scanItem(
        bytes32 qrHash,
        string calldata metadataURI,
        uint256 creditAmount
    ) external {
        if (_items[qrHash].exists) revert ItemAlreadyRegistered(qrHash);
        if (creditAmount == 0)     revert ZeroCreditAmount();

        _items[qrHash] = ItemRecord({
            qrHash:       qrHash,
            seller:       msg.sender,
            metadataURI:  metadataURI,
            creditAmount: creditAmount,
            scannedAt:    block.timestamp,
            exists:       true
        });

        emit ItemScanned(qrHash, msg.sender, metadataURI, creditAmount, block.timestamp);
    }

    /**
     * @notice Issue a credit to `buyer` for the given item.
     *         Caller must send enough ETH to back the credit (msg.value >= creditAmount).
     * @param qrHash  Item identifier.
     * @param buyer   Wallet that receives the credit.
     */
    function issueCredit(bytes32 qrHash, address buyer) external payable {
        ItemRecord storage item = _items[qrHash];
        if (!item.exists) revert ItemNotFound(qrHash);
        if (msg.value < item.creditAmount)
            revert InsufficientCredit(msg.value, item.creditAmount);

        creditBalance[buyer] += item.creditAmount;

        emit CreditIssued(qrHash, buyer, item.creditAmount);

        // Refund any excess ETH sent
        uint256 excess = msg.value - item.creditAmount;
        if (excess > 0) {
            (bool ok, ) = payable(msg.sender).call{value: excess}("");
            if (!ok) revert TransferFailed();
        }
    }

    /**
     * @notice Send an optional tip to the seller of an item.
     * @param qrHash  Item identifier — determines who receives the tip.
     */
    function tipSeller(bytes32 qrHash) external payable {
        ItemRecord storage item = _items[qrHash];
        if (!item.exists) revert ItemNotFound(qrHash);
        if (msg.value == 0) revert ZeroTipAmount();

        emit TipSent(qrHash, msg.sender, item.seller, msg.value);

        (bool ok, ) = payable(item.seller).call{value: msg.value}("");
        if (!ok) revert TransferFailed();
    }

    /**
     * @notice Redeem credits stored in `msg.sender`'s balance.
     * @param amount  Amount of credits (wei) to redeem.
     */
    function redeemCredit(uint256 amount) external {
        if (creditBalance[msg.sender] < amount)
            revert InsufficientCredit(creditBalance[msg.sender], amount);

        creditBalance[msg.sender] -= amount;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // ─── View functions ─────────────────────────────────────────────────────

    /**
     * @notice Retrieve the on-chain record for an item.
     * @param qrHash  Item identifier.
     */
    function getItemRecord(bytes32 qrHash)
        external
        view
        returns (ItemRecord memory)
    {
        if (!_items[qrHash].exists) revert ItemNotFound(qrHash);
        return _items[qrHash];
    }

    // ─── Owner functions ────────────────────────────────────────────────────

    /**
     * @notice Withdraw ETH held in the contract (owner only).
     */
    function withdraw() external onlyOwner {
        (bool ok, ) = payable(owner).call{value: address(this).balance}("");
        if (!ok) revert TransferFailed();
    }

    receive() external payable {}
}

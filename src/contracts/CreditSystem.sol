// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CreditSystem
 * @author Henry Howard Kennemore III — Blue-Star / G.O.S.
 * @notice ERC-20-compatible credit token for the QR Store quantum economics model.
 *         Credits are minted when items are scanned and can be redeemed or transferred.
 */
contract CreditSystem {
    // ─────────────────────── Events ───────────────────────

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event CreditsMinted(address indexed to, uint256 amount, string reason);
    event CreditsRedeemed(address indexed from, uint256 amount);

    // ─────────────────────── State ────────────────────────

    string  public constant name     = "Blue-Star Credit";
    string  public constant symbol   = "BLUESTAR";
    uint8   public constant decimals = 18;

    address public owner;
    uint256 public totalSupply;

    mapping(address => uint256)                     public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    /// Addresses authorised to mint credits (e.g. the QRStore contract)
    mapping(address => bool) public minters;

    // ─────────────────────── Modifiers ────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "CreditSystem: not owner");
        _;
    }

    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner, "CreditSystem: not minter");
        _;
    }

    // ─────────────────────── Constructor ──────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────── ERC-20 Core ──────────────────

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "CreditSystem: insufficient allowance");
        allowance[from][msg.sender] -= amount;
        _transfer(from, to, amount);
        return true;
    }

    // ─────────────────────── Credit Operations ────────────

    /**
     * @notice Mint new credits to a recipient.
     * @param to     Recipient address.
     * @param amount Amount to mint (in wei units, 18 decimals).
     * @param reason Human-readable reason for the mint (e.g. "QR scan credit").
     */
    function mint(address to, uint256 amount, string calldata reason) external onlyMinter {
        require(to != address(0), "CreditSystem: zero address");
        totalSupply     += amount;
        balanceOf[to]   += amount;
        emit Transfer(address(0), to, amount);
        emit CreditsMinted(to, amount, reason);
    }

    /**
     * @notice Redeem (burn) credits from the caller's balance.
     * @param amount Amount to redeem.
     */
    function redeem(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "CreditSystem: insufficient balance");
        balanceOf[msg.sender] -= amount;
        totalSupply           -= amount;
        emit Transfer(msg.sender, address(0), amount);
        emit CreditsRedeemed(msg.sender, amount);
    }

    // ─────────────────────── Admin ────────────────────────

    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
    }

    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "CreditSystem: zero address");
        owner = newOwner;
    }

    // ─────────────────────── Internal ─────────────────────

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "CreditSystem: insufficient balance");
        require(to != address(0), "CreditSystem: zero address");
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        emit Transfer(from, to, amount);
    }
}

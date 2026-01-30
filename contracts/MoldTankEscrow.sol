// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title MoldTankEscrow
 * @dev Escrow contract for the MoldTank bounty marketplace
 * 
 * 🦞 "Throw 'em in, see who survives"
 * 
 * Features:
 * - USDC deposits for bounties
 * - QA system releases to winners
 * - Time-locked refunds for expired bounties
 * - Platform fee collection (5%)
 * - Emergency pause and multisig recovery
 */
contract MoldTankEscrow is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════
    // ROLES
    // ═══════════════════════════════════════════════════════════════
    
    bytes32 public constant QA_VALIDATOR_ROLE = keccak256("QA_VALIDATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════
    
    IERC20 public immutable usdc;
    address public treasury;
    
    uint256 public constant PLATFORM_FEE_BPS = 500; // 5%
    uint256 public constant REFUND_GRACE_PERIOD = 24 hours;
    uint256 public constant BPS_DENOMINATOR = 10000;

    struct Bounty {
        address poster;
        uint256 amount;
        uint256 deadline;
        bool funded;
        bool released;
        bool refunded;
        address winner;
    }

    mapping(bytes32 => Bounty) public bounties;
    
    // Track submissions per bounty per agent (prevent duplicates)
    mapping(bytes32 => mapping(address => bool)) public hasSubmitted;

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════
    
    event BountyFunded(
        bytes32 indexed bountyId,
        address indexed poster,
        uint256 amount,
        uint256 deadline
    );
    
    event BountyReleased(
        bytes32 indexed bountyId,
        address indexed winner,
        uint256 winnerAmount,
        uint256 platformFee
    );
    
    event BountyRefunded(
        bytes32 indexed bountyId,
        address indexed poster,
        uint256 amount
    );
    
    event SubmissionRecorded(
        bytes32 indexed bountyId,
        address indexed agent,
        bytes32 payloadHash
    );
    
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    // ═══════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════
    
    error BountyAlreadyFunded();
    error BountyNotFunded();
    error BountyAlreadyReleased();
    error BountyAlreadyRefunded();
    error DeadlineNotPassed();
    error GracePeriodNotPassed();
    error OnlyPoster();
    error AlreadySubmitted();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidAddress();

    // ═══════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════
    
    constructor(address _usdc, address _treasury) {
        if (_usdc == address(0) || _treasury == address(0)) revert InvalidAddress();
        
        usdc = IERC20(_usdc);
        treasury = _treasury;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════
    // POSTER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Deposit USDC for a bounty
     * @param bountyId Unique identifier for the bounty (matches database UUID)
     * @param amount Amount of USDC to deposit
     * @param deadline Unix timestamp when bounty expires
     */
    function deposit(
        bytes32 bountyId,
        uint256 amount,
        uint256 deadline
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (bounties[bountyId].funded) revert BountyAlreadyFunded();

        bounties[bountyId] = Bounty({
            poster: msg.sender,
            amount: amount,
            deadline: deadline,
            funded: true,
            released: false,
            refunded: false,
            winner: address(0)
        });

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit BountyFunded(bountyId, msg.sender, amount, deadline);
    }

    /**
     * @dev Request refund after deadline + grace period
     * @param bountyId The bounty to refund
     */
    function refund(bytes32 bountyId) external nonReentrant whenNotPaused {
        Bounty storage bounty = bounties[bountyId];
        
        if (!bounty.funded) revert BountyNotFunded();
        if (bounty.released) revert BountyAlreadyReleased();
        if (bounty.refunded) revert BountyAlreadyRefunded();
        if (msg.sender != bounty.poster) revert OnlyPoster();
        if (block.timestamp < bounty.deadline + REFUND_GRACE_PERIOD) revert GracePeriodNotPassed();

        bounty.refunded = true;
        uint256 amount = bounty.amount;

        usdc.safeTransfer(bounty.poster, amount);

        emit BountyRefunded(bountyId, bounty.poster, amount);
    }

    // ═══════════════════════════════════════════════════════════════
    // AGENT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Record a submission (prevents duplicate submissions per agent)
     * @param bountyId The bounty being submitted to
     * @param payloadHash Hash of the submission payload
     */
    function recordSubmission(
        bytes32 bountyId,
        bytes32 payloadHash
    ) external whenNotPaused {
        Bounty storage bounty = bounties[bountyId];
        
        if (!bounty.funded) revert BountyNotFunded();
        if (bounty.released) revert BountyAlreadyReleased();
        if (bounty.refunded) revert BountyAlreadyRefunded();
        if (hasSubmitted[bountyId][msg.sender]) revert AlreadySubmitted();

        hasSubmitted[bountyId][msg.sender] = true;

        emit SubmissionRecorded(bountyId, msg.sender, payloadHash);
    }

    // ═══════════════════════════════════════════════════════════════
    // QA VALIDATOR FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Release funds to winner (only callable by QA validators)
     * @param bountyId The bounty to release
     * @param winner Address of the winning agent
     */
    function release(
        bytes32 bountyId,
        address winner
    ) external nonReentrant whenNotPaused onlyRole(QA_VALIDATOR_ROLE) {
        if (winner == address(0)) revert InvalidAddress();
        
        Bounty storage bounty = bounties[bountyId];
        
        if (!bounty.funded) revert BountyNotFunded();
        if (bounty.released) revert BountyAlreadyReleased();
        if (bounty.refunded) revert BountyAlreadyRefunded();

        bounty.released = true;
        bounty.winner = winner;

        uint256 amount = bounty.amount;
        uint256 platformFee = (amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 winnerAmount = amount - platformFee;

        // Transfer to winner
        usdc.safeTransfer(winner, winnerAmount);
        
        // Transfer fee to treasury
        if (platformFee > 0) {
            usdc.safeTransfer(treasury, platformFee);
        }

        emit BountyReleased(bountyId, winner, winnerAmount, platformFee);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Add a QA validator
     */
    function addQAValidator(address validator) external onlyRole(ADMIN_ROLE) {
        if (validator == address(0)) revert InvalidAddress();
        grantRole(QA_VALIDATOR_ROLE, validator);
    }

    /**
     * @dev Remove a QA validator
     */
    function removeQAValidator(address validator) external onlyRole(ADMIN_ROLE) {
        revokeRole(QA_VALIDATOR_ROLE, validator);
    }

    /**
     * @dev Update treasury address
     */
    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        if (newTreasury == address(0)) revert InvalidAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal (requires DEFAULT_ADMIN_ROLE)
     * Only use in extreme cases
     */
    function emergencyWithdraw(
        bytes32 bountyId,
        address recipient
    ) external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
        if (recipient == address(0)) revert InvalidAddress();
        
        Bounty storage bounty = bounties[bountyId];
        
        if (!bounty.funded) revert BountyNotFunded();
        if (bounty.released || bounty.refunded) revert BountyAlreadyReleased();

        bounty.refunded = true;
        uint256 amount = bounty.amount;

        usdc.safeTransfer(recipient, amount);

        emit BountyRefunded(bountyId, recipient, amount);
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Get bounty details
     */
    function getBounty(bytes32 bountyId) external view returns (
        address poster,
        uint256 amount,
        uint256 deadline,
        bool funded,
        bool released,
        bool refunded,
        address winner
    ) {
        Bounty memory b = bounties[bountyId];
        return (b.poster, b.amount, b.deadline, b.funded, b.released, b.refunded, b.winner);
    }

    /**
     * @dev Check if an agent has submitted to a bounty
     */
    function hasAgentSubmitted(bytes32 bountyId, address agent) external view returns (bool) {
        return hasSubmitted[bountyId][agent];
    }

    /**
     * @dev Check if refund is available
     */
    function canRefund(bytes32 bountyId) external view returns (bool) {
        Bounty memory b = bounties[bountyId];
        return b.funded && 
               !b.released && 
               !b.refunded && 
               block.timestamp >= b.deadline + REFUND_GRACE_PERIOD;
    }

    /**
     * @dev Calculate winner payout and platform fee
     */
    function calculatePayout(uint256 amount) external pure returns (
        uint256 winnerAmount,
        uint256 platformFee
    ) {
        platformFee = (amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        winnerAmount = amount - platformFee;
    }
}

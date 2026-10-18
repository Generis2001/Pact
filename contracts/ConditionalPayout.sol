// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ConditionalPayout is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum AgreementState {
        PENDING,
        ACTIVE,
        RELEASED,
        CANCELLED,
        EXPIRED
    }

    struct Agreement {
        address payer;
        address recipient;
        address approver;
        uint256 amount;
        string conditionDescription;
        uint256 conditionDeadline;
        string metadataURI;
        AgreementState state;
    }

    error ZeroAddress();
    error InvalidAmount();
    error InvalidDeadline();
    error AgreementNotFound();
    error Unauthorized();
    error InvalidState();
    error DeadlineNotReached();

    event AgreementCreated(
        uint256 indexed agreementId,
        address indexed payer,
        address indexed recipient,
        address approver,
        uint256 amount,
        uint256 conditionDeadline,
        string conditionDescription,
        string metadataURI
    );
    event AgreementFunded(uint256 indexed agreementId, address indexed payer, uint256 amount);
    event ConditionApproved(uint256 indexed agreementId, address indexed approver, address indexed recipient, uint256 amount);
    event AgreementCancelled(uint256 indexed agreementId);
    event AgreementExpired(uint256 indexed agreementId, uint256 amountRefunded);

    IERC20 private immutable _usdc;
    uint256 private _nextAgreementId = 1;

    mapping(uint256 => Agreement) private _agreements;
    mapping(address => uint256[]) private _userAgreements;

    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        _usdc = IERC20(usdc_);
    }

    /// @notice Creates a new conditional payout agreement.
    /// @param recipient Recipient of funds if condition is approved.
    /// @param approver Oracle/approver authorized to approve condition.
    /// @param amount Payment amount in USDC base units.
    /// @param conditionDeadline Deadline after which payer can reclaim active funds.
    /// @param conditionDescription Human-readable condition description.
    /// @param metadataURI Off-chain metadata URI.
    /// @return agreementId Newly created agreement identifier.
    function createAgreement(
        address recipient,
        address approver,
        uint256 amount,
        uint256 conditionDeadline,
        string calldata conditionDescription,
        string calldata metadataURI
    ) external returns (uint256 agreementId) {
        if (recipient == address(0) || approver == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        if (conditionDeadline <= block.timestamp) revert InvalidDeadline();

        agreementId = _nextAgreementId;
        _nextAgreementId = agreementId + 1;

        Agreement storage agr = _agreements[agreementId];
        agr.payer = msg.sender;
        agr.recipient = recipient;
        agr.approver = approver;
        agr.amount = amount;
        agr.conditionDescription = conditionDescription;
        agr.conditionDeadline = conditionDeadline;
        agr.metadataURI = metadataURI;
        agr.state = AgreementState.PENDING;

        _userAgreements[msg.sender].push(agreementId);
        if (recipient != msg.sender) _userAgreements[recipient].push(agreementId);
        if (approver != msg.sender && approver != recipient) _userAgreements[approver].push(agreementId);

        emit AgreementCreated(
            agreementId,
            msg.sender,
            recipient,
            approver,
            amount,
            conditionDeadline,
            conditionDescription,
            metadataURI
        );
    }

    /// @notice Funds a pending agreement by pulling USDC from payer.
    /// @param agreementId Agreement identifier.
    function fundAgreement(uint256 agreementId) external nonReentrant {
        Agreement storage agr = _agreements[agreementId];
        if (agr.payer == address(0)) revert AgreementNotFound();
        if (msg.sender != agr.payer) revert Unauthorized();
        if (agr.state != AgreementState.PENDING) revert InvalidState();

        agr.state = AgreementState.ACTIVE;
        _usdc.safeTransferFrom(msg.sender, address(this), agr.amount);

        emit AgreementFunded(agreementId, msg.sender, agr.amount);
    }

    error DeadlinePassed();

    /// @notice Approves condition for an active agreement and releases funds.
    /// @dev Reverts if the condition deadline has already passed to enforce expiry semantics.
    /// @param agreementId Agreement identifier.
    function approveCondition(uint256 agreementId) external nonReentrant {
        Agreement storage agr = _agreements[agreementId];
        if (agr.payer == address(0)) revert AgreementNotFound();
        if (msg.sender != agr.approver) revert Unauthorized();
        if (agr.state != AgreementState.ACTIVE) revert InvalidState();
        if (block.timestamp > agr.conditionDeadline) revert DeadlinePassed();

        agr.state = AgreementState.RELEASED;
        _usdc.safeTransfer(agr.recipient, agr.amount);

        emit ConditionApproved(agreementId, msg.sender, agr.recipient, agr.amount);
    }

    /// @notice Cancels a pending agreement before funding.
    /// @param agreementId Agreement identifier.
    function cancelAgreement(uint256 agreementId) external {
        Agreement storage agr = _agreements[agreementId];
        if (agr.payer == address(0)) revert AgreementNotFound();
        if (msg.sender != agr.payer) revert Unauthorized();
        if (agr.state != AgreementState.PENDING) revert InvalidState();

        agr.state = AgreementState.CANCELLED;
        emit AgreementCancelled(agreementId);
    }

    /// @notice Claims expiry refund after deadline for an active agreement.
    /// @param agreementId Agreement identifier.
    function claimExpiry(uint256 agreementId) external nonReentrant {
        Agreement storage agr = _agreements[agreementId];
        if (agr.payer == address(0)) revert AgreementNotFound();
        if (msg.sender != agr.payer) revert Unauthorized();
        if (agr.state != AgreementState.ACTIVE) revert InvalidState();
        if (block.timestamp <= agr.conditionDeadline) revert DeadlineNotReached();

        agr.state = AgreementState.EXPIRED;
        _usdc.safeTransfer(agr.payer, agr.amount);

        emit AgreementExpired(agreementId, agr.amount);
    }

    /// @notice Returns agreement details.
    /// @param agreementId Agreement identifier.
    /// @return Agreement struct.
    function getAgreement(uint256 agreementId) external view returns (Agreement memory) {
        Agreement memory agr = _agreements[agreementId];
        if (agr.payer == address(0)) revert AgreementNotFound();
        return agr;
    }

    /// @notice Returns agreement IDs associated with a user.
    /// @param user User address.
    /// @return Array of agreement IDs.
    function getUserAgreements(address user) external view returns (uint256[] memory) {
        return _userAgreements[user];
    }
}

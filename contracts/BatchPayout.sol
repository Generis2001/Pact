// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BatchPayout is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum BatchState {
        NONE,
        EXECUTED
    }

    struct BatchRecipient {
        address recipient;
        uint256 amount;
    }

    error ZeroAddress();
    error EmptyRecipients();
    error TooManyRecipients();
    error InvalidRecipient();
    error InvalidAmount();
    error DuplicatePaymentSet();

    event BatchExecuted(
        bytes32 indexed paymentSetId,
        address indexed payer,
        uint256 recipientCount,
        uint256 totalAmount
    );
    event PaymentSent(bytes32 indexed paymentSetId, address indexed recipient, uint256 amount);

    IERC20 private immutable _usdc;

    /// @dev Scoped by payer so that two different payers can use the same paymentSetId
    ///      independently, and a frontrunner cannot grief a legitimate payer by pre-claiming their ID.
    mapping(address => mapping(bytes32 => BatchState)) private _batchStates;

    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        _usdc = IERC20(usdc_);
    }

    /// @notice Executes a one-shot USDC batch payout for a unique payment set id.
    /// @param paymentSetId Unique caller-supplied payment set identifier.
    /// @param recipients Recipient list and amounts.
    function executeBatch(bytes32 paymentSetId, BatchRecipient[] calldata recipients) external nonReentrant {
        if (_batchStates[msg.sender][paymentSetId] == BatchState.EXECUTED) revert DuplicatePaymentSet();

        uint256 length = recipients.length;
        if (length == 0) revert EmptyRecipients();
        if (length > 500) revert TooManyRecipients();

        uint256 totalAmount;
        for (uint256 i = 0; i < length; ++i) {
            BatchRecipient calldata item = recipients[i];
            if (item.recipient == address(0)) revert InvalidRecipient();
            if (item.amount == 0) revert InvalidAmount();
            totalAmount += item.amount;
        }

        _batchStates[msg.sender][paymentSetId] = BatchState.EXECUTED;
        _usdc.safeTransferFrom(msg.sender, address(this), totalAmount);

        for (uint256 i = 0; i < length; ++i) {
            BatchRecipient calldata item = recipients[i];
            _usdc.safeTransfer(item.recipient, item.amount);
            emit PaymentSent(paymentSetId, item.recipient, item.amount);
        }

        emit BatchExecuted(paymentSetId, msg.sender, length, totalAmount);
    }

    /// @notice Estimates total amount and basic validation for a batch.
    /// @param recipients Recipient list and amounts.
    /// @return total Total amount sum.
    /// @return valid True if basic validations pass.
    /// @return errorMessage Empty when valid, otherwise human-readable reason.
    function estimateBatch(
        BatchRecipient[] calldata recipients
    ) external pure returns (uint256 total, bool valid, string memory errorMessage) {
        uint256 length = recipients.length;
        if (length == 0) {
            return (0, false, "EMPTY_RECIPIENTS");
        }
        if (length > 500) {
            return (0, false, "TOO_MANY_RECIPIENTS");
        }

        for (uint256 i = 0; i < length; ++i) {
            BatchRecipient calldata item = recipients[i];
            if (item.recipient == address(0)) {
                return (0, false, "ZERO_RECIPIENT");
            }
            if (item.amount == 0) {
                return (0, false, "ZERO_AMOUNT");
            }
            total += item.amount;
        }

        return (total, true, "");
    }

    /// @notice Returns whether a specific payer has already executed a payment set.
    /// @param payer Payer address.
    /// @param paymentSetId Payment set identifier.
    /// @return True if executed by that payer.
    function isExecuted(address payer, bytes32 paymentSetId) external view returns (bool) {
        return _batchStates[payer][paymentSetId] == BatchState.EXECUTED;
    }

    /// @notice Returns execution flags for multiple payment set ids for a specific payer.
    /// @param payer Payer address.
    /// @param paymentSetIds Payment set identifiers.
    /// @return statuses Execution statuses.
    function getExecutedBatches(address payer, bytes32[] calldata paymentSetIds) external view returns (bool[] memory statuses) {
        uint256 length = paymentSetIds.length;
        statuses = new bool[](length);

        for (uint256 i = 0; i < length; ++i) {
            statuses[i] = _batchStates[payer][paymentSetIds[i]] == BatchState.EXECUTED;
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ScheduledPayout is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum ScheduleState {
        ACTIVE,
        CANCELLED,
        COMPLETED
    }

    struct Schedule {
        address payer;
        address recipient;
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
        uint256 intervalSeconds;
        uint256 lastExecuted;
        uint256 totalPaid;
        uint256 maxExecutions;
        uint256 executionCount;
        bool active;
        string description;
        ScheduleState state;
    }

    error ZeroAddress();
    error InvalidAmount();
    error InvalidTimeRange();
    error InvalidInterval();
    error ScheduleNotFound();
    error Unauthorized();
    error InactiveSchedule();
    error NotDue();
    error InsufficientScheduleBalance();
    error EndTimePassed();
    error MaxExecutionsReached();
    error InvalidWithdrawalAmount();

    event ScheduleCreated(
        uint256 indexed scheduleId,
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        uint256 startTime,
        uint256 endTime,
        uint256 intervalSeconds,
        uint256 maxExecutions,
        string description
    );
    event ScheduleFunded(uint256 indexed scheduleId, address indexed payer, uint256 fundAmount, uint256 newBalance);
    event ScheduleExecuted(
        uint256 indexed scheduleId,
        address indexed caller,
        address indexed recipient,
        uint256 amount,
        uint256 executionCount,
        uint256 totalPaid
    );
    event ScheduleCancelled(uint256 indexed scheduleId, uint256 refundedAmount);
    event ScheduleCompleted(uint256 indexed scheduleId, uint256 refundedAmount);
    event FundsWithdrawn(uint256 indexed scheduleId, uint256 amount, uint256 remainingBalance);

    IERC20 private immutable _usdc;
    uint256 private _nextScheduleId = 1;

    mapping(uint256 => Schedule) private _schedules;
    mapping(uint256 => uint256) private _balances;
    mapping(address => uint256[]) private _payerSchedules;

    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        _usdc = IERC20(usdc_);
    }

    /// @notice Creates a recurring or one-time payout schedule.
    /// @param recipient Recipient of each payout.
    /// @param amount Amount paid per execution in USDC base units.
    /// @param startTime Schedule start timestamp.
    /// @param endTime End timestamp (0 for no end).
    /// @param intervalSeconds Interval between executions (minimum 1 day).
    /// @param maxExecutions Maximum execution count (0 for unlimited).
    /// @param description Human-readable schedule description.
    /// @return scheduleId Newly created schedule identifier.
    function createSchedule(
        address recipient,
        uint256 amount,
        uint256 startTime,
        uint256 endTime,
        uint256 intervalSeconds,
        uint256 maxExecutions,
        string calldata description
    ) external returns (uint256 scheduleId) {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        if (intervalSeconds < 86400) revert InvalidInterval();
        if (endTime != 0 && endTime <= startTime) revert InvalidTimeRange();

        scheduleId = _nextScheduleId;
        _nextScheduleId = scheduleId + 1;

        Schedule storage sch = _schedules[scheduleId];
        sch.payer = msg.sender;
        sch.recipient = recipient;
        sch.amount = amount;
        sch.startTime = startTime;
        sch.endTime = endTime;
        sch.intervalSeconds = intervalSeconds;
        sch.maxExecutions = maxExecutions;
        sch.active = true;
        sch.description = description;
        sch.state = ScheduleState.ACTIVE;

        _payerSchedules[msg.sender].push(scheduleId);

        emit ScheduleCreated(
            scheduleId,
            msg.sender,
            recipient,
            amount,
            startTime,
            endTime,
            intervalSeconds,
            maxExecutions,
            description
        );
    }

    /// @notice Funds a schedule escrow pool with USDC.
    /// @param scheduleId Schedule identifier.
    /// @param fundAmount Amount to deposit into the schedule pool.
    function fundSchedule(uint256 scheduleId, uint256 fundAmount) external nonReentrant {
        Schedule storage sch = _schedules[scheduleId];
        if (sch.payer == address(0)) revert ScheduleNotFound();
        if (msg.sender != sch.payer) revert Unauthorized();
        if (!sch.active || sch.state != ScheduleState.ACTIVE) revert InactiveSchedule();
        if (sch.endTime != 0 && block.timestamp > sch.endTime) revert EndTimePassed();
        if (fundAmount == 0) revert InvalidAmount();

        _balances[scheduleId] += fundAmount;
        _usdc.safeTransferFrom(msg.sender, address(this), fundAmount);

        emit ScheduleFunded(scheduleId, msg.sender, fundAmount, _balances[scheduleId]);
    }

    /// @notice Executes a due scheduled payout.
    /// @param scheduleId Schedule identifier.
    function executeSchedule(uint256 scheduleId) external nonReentrant {
        Schedule storage sch = _schedules[scheduleId];
        if (sch.payer == address(0)) revert ScheduleNotFound();
        if (!sch.active || sch.state != ScheduleState.ACTIVE) revert InactiveSchedule();
        if (block.timestamp < sch.startTime) revert NotDue();
        if (sch.endTime != 0 && block.timestamp > sch.endTime) revert EndTimePassed();
        if (sch.maxExecutions != 0 && sch.executionCount >= sch.maxExecutions) revert MaxExecutionsReached();

        uint256 dueFrom = sch.lastExecuted == 0 ? sch.startTime : sch.lastExecuted + sch.intervalSeconds;
        if (block.timestamp < dueFrom) revert NotDue();
        if (_balances[scheduleId] < sch.amount) revert InsufficientScheduleBalance();

        sch.lastExecuted = block.timestamp;
        sch.executionCount += 1;
        sch.totalPaid += sch.amount;
        _balances[scheduleId] -= sch.amount;

        uint256 completionRefund;
        if (sch.maxExecutions != 0 && sch.executionCount >= sch.maxExecutions) {
            sch.active = false;
            sch.state = ScheduleState.COMPLETED;
            completionRefund = _balances[scheduleId];
            _balances[scheduleId] = 0;
        }

        _usdc.safeTransfer(sch.recipient, sch.amount);
        if (completionRefund > 0) _usdc.safeTransfer(sch.payer, completionRefund);

        emit ScheduleExecuted(
            scheduleId,
            msg.sender,
            sch.recipient,
            sch.amount,
            sch.executionCount,
            sch.totalPaid
        );
        if (sch.state == ScheduleState.COMPLETED) emit ScheduleCompleted(scheduleId, completionRefund);
    }

    /// @notice Cancels a schedule and refunds remaining pool balance to payer.
    /// @param scheduleId Schedule identifier.
    function cancelSchedule(uint256 scheduleId) external nonReentrant {
        Schedule storage sch = _schedules[scheduleId];
        if (sch.payer == address(0)) revert ScheduleNotFound();
        if (msg.sender != sch.payer) revert Unauthorized();
        if (!sch.active || sch.state != ScheduleState.ACTIVE) revert InactiveSchedule();

        sch.active = false;
        sch.state = ScheduleState.CANCELLED;

        uint256 refundAmount = _balances[scheduleId];
        _balances[scheduleId] = 0;

        if (refundAmount > 0) {
            _usdc.safeTransfer(sch.payer, refundAmount);
        }

        emit ScheduleCancelled(scheduleId, refundAmount);
    }

    /// @notice Withdraws excess funds; only a live schedule requires a one-payment buffer.
    /// @param scheduleId Schedule identifier.
    /// @param amount Amount to withdraw.
    function withdrawExcessFunds(uint256 scheduleId, uint256 amount) external nonReentrant {
        Schedule storage sch = _schedules[scheduleId];
        if (sch.payer == address(0)) revert ScheduleNotFound();
        if (msg.sender != sch.payer) revert Unauthorized();
        if (amount == 0) revert InvalidWithdrawalAmount();

        uint256 balance = _balances[scheduleId];
        bool liveSchedule = sch.active && sch.state == ScheduleState.ACTIVE && (sch.endTime == 0 || block.timestamp <= sch.endTime);
        uint256 buffer = liveSchedule ? sch.amount : 0;
        if (balance < buffer) revert InvalidWithdrawalAmount();
        uint256 withdrawable = balance - buffer;
        if (amount > withdrawable) revert InvalidWithdrawalAmount();

        _balances[scheduleId] = balance - amount;
        _usdc.safeTransfer(sch.payer, amount);

        emit FundsWithdrawn(scheduleId, amount, _balances[scheduleId]);
    }

    /// @notice Returns whether a schedule is currently due for execution.
    /// @param scheduleId Schedule identifier.
    /// @return True if schedule can be executed now.
    function isDue(uint256 scheduleId) external view returns (bool) {
        Schedule memory sch = _schedules[scheduleId];
        if (sch.payer == address(0)) return false;
        if (!sch.active || sch.state != ScheduleState.ACTIVE) return false;
        if (block.timestamp < sch.startTime) return false;
        if (sch.endTime != 0 && block.timestamp > sch.endTime) return false;
        if (sch.maxExecutions != 0 && sch.executionCount >= sch.maxExecutions) return false;
        if (_balances[scheduleId] < sch.amount) return false;

        uint256 dueFrom = sch.lastExecuted == 0 ? sch.startTime : sch.lastExecuted + sch.intervalSeconds;
        return block.timestamp >= dueFrom;
    }

    /// @notice Returns schedule details.
    /// @param scheduleId Schedule identifier.
    /// @return Schedule struct.
    function getSchedule(uint256 scheduleId) external view returns (Schedule memory) {
        Schedule memory sch = _schedules[scheduleId];
        if (sch.payer == address(0)) revert ScheduleNotFound();
        return sch;
    }

    /// @notice Returns current escrow pool balance for a schedule.
    /// @param scheduleId Schedule identifier.
    /// @return Current USDC balance allocated to the schedule.
    function getBalance(uint256 scheduleId) external view returns (uint256) {
        if (_schedules[scheduleId].payer == address(0)) revert ScheduleNotFound();
        return _balances[scheduleId];
    }

    /// @notice Returns schedule IDs created by a payer.
    /// @param payer Payer address.
    /// @return Array of schedule IDs.
    function getPayerSchedules(address payer) external view returns (uint256[] memory) {
        return _payerSchedules[payer];
    }
}

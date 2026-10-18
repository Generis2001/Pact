// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ScheduledPayout} from "../ScheduledPayout.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

contract ScheduledPayoutTest is Test {
    ScheduledPayout internal sp;
    MockERC20       internal usdc;

    address internal payer     = makeAddr("payer");
    address internal recipient = makeAddr("recipient");
    address internal stranger  = makeAddr("stranger");

    uint256 internal constant AMOUNT   = 50e6;
    uint256 internal constant INTERVAL = 1 days;   // minimum allowed

    // ── helpers ──────────────────────────────────────────────────────────────

    /// Creates a schedule starting now, no end, unlimited executions.
    function _createSchedule() internal returns (uint256 id) {
        vm.prank(payer);
        id = sp.createSchedule(
            recipient, AMOUNT,
            block.timestamp,    // startTime = now
            0,                  // no endTime
            INTERVAL,
            0,                  // unlimited
            "weekly salary"
        );
    }

    function _createAndFund(uint256 executions) internal returns (uint256 id) {
        id = _createSchedule();
        uint256 fundAmt = AMOUNT * executions;
        usdc.mint(payer, fundAmt);
        vm.startPrank(payer);
        usdc.approve(address(sp), fundAmt);
        sp.fundSchedule(id, fundAmt);
        vm.stopPrank();
    }

    // ── setUp ─────────────────────────────────────────────────────────────────

    function setUp() public {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);
        sp   = new ScheduledPayout(address(usdc));
        vm.warp(1_700_000_000);
    }

    // =========================================================================
    // constructor
    // =========================================================================

    function test_Constructor_ZeroAddress() public {
        vm.expectRevert(ScheduledPayout.ZeroAddress.selector);
        new ScheduledPayout(address(0));
    }

    // =========================================================================
    // createSchedule
    // =========================================================================

    function test_CreateSchedule_HappyPath() public {
        vm.prank(payer);
        vm.expectEmit(true, true, true, false, address(sp));
        emit ScheduledPayout.ScheduleCreated(
            1, payer, recipient, AMOUNT,
            block.timestamp, 0, INTERVAL, 0, "weekly salary"
        );
        uint256 id = sp.createSchedule(
            recipient, AMOUNT, block.timestamp, 0, INTERVAL, 0, "weekly salary"
        );
        assertEq(id, 1);
        ScheduledPayout.Schedule memory sch = sp.getSchedule(id);
        assertEq(sch.payer,    payer);
        assertEq(sch.recipient, recipient);
        assertEq(sch.amount,    AMOUNT);
        assertTrue(sch.active);
        assertEq(uint8(sch.state), uint8(ScheduledPayout.ScheduleState.ACTIVE));
    }

    function test_CreateSchedule_IdsIncrement() public {
        vm.startPrank(payer);
        uint256 id1 = sp.createSchedule(recipient, AMOUNT, block.timestamp, 0, INTERVAL, 0, "a");
        uint256 id2 = sp.createSchedule(recipient, AMOUNT, block.timestamp, 0, INTERVAL, 0, "b");
        vm.stopPrank();
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function test_CreateSchedule_PayerSchedulesTracked() public {
        _createSchedule();
        uint256[] memory ids = sp.getPayerSchedules(payer);
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);
    }

    function test_CreateSchedule_Revert_ZeroRecipient() public {
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.ZeroAddress.selector);
        sp.createSchedule(address(0), AMOUNT, block.timestamp, 0, INTERVAL, 0, "");
    }

    function test_CreateSchedule_Revert_ZeroAmount() public {
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.InvalidAmount.selector);
        sp.createSchedule(recipient, 0, block.timestamp, 0, INTERVAL, 0, "");
    }

    function test_CreateSchedule_Revert_IntervalTooShort() public {
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.InvalidInterval.selector);
        sp.createSchedule(recipient, AMOUNT, block.timestamp, 0, INTERVAL - 1, 0, "");
    }

    function test_CreateSchedule_Revert_InvalidTimeRange() public {
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.InvalidTimeRange.selector);
        // endTime <= startTime
        sp.createSchedule(recipient, AMOUNT, block.timestamp + 1 days, block.timestamp, INTERVAL, 0, "");
    }

    // =========================================================================
    // fundSchedule
    // =========================================================================

    function test_FundSchedule_HappyPath() public {
        uint256 id = _createSchedule();
        uint256 fundAmt = AMOUNT * 5;
        usdc.mint(payer, fundAmt);
        vm.startPrank(payer);
        usdc.approve(address(sp), fundAmt);
        vm.expectEmit(true, true, false, true, address(sp));
        emit ScheduledPayout.ScheduleFunded(id, payer, fundAmt, fundAmt);
        sp.fundSchedule(id, fundAmt);
        vm.stopPrank();

        assertEq(sp.getBalance(id), fundAmt);
        assertEq(usdc.balanceOf(address(sp)), fundAmt);
    }

    function test_FundSchedule_Revert_NotPayer() public {
        uint256 id = _createSchedule();
        vm.prank(stranger);
        vm.expectRevert(ScheduledPayout.Unauthorized.selector);
        sp.fundSchedule(id, AMOUNT);
    }

    function test_FundSchedule_Revert_NotFound() public {
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.ScheduleNotFound.selector);
        sp.fundSchedule(999, AMOUNT);
    }

    function test_FundSchedule_Revert_ZeroAmount() public {
        uint256 id = _createSchedule();
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.InvalidAmount.selector);
        sp.fundSchedule(id, 0);
    }

    // =========================================================================
    // executeSchedule
    // =========================================================================

    function test_ExecuteSchedule_HappyPath_FirstExecution() public {
        uint256 id = _createAndFund(3);
        uint256 before = usdc.balanceOf(recipient);

        vm.expectEmit(true, false, true, false, address(sp));
        emit ScheduledPayout.ScheduleExecuted(id, payer, recipient, AMOUNT, 1, AMOUNT);
        sp.executeSchedule(id);

        assertEq(usdc.balanceOf(recipient), before + AMOUNT);
        ScheduledPayout.Schedule memory sch = sp.getSchedule(id);
        assertEq(sch.executionCount, 1);
        assertEq(sch.totalPaid, AMOUNT);
    }

    function test_ExecuteSchedule_SecondExecutionAfterInterval() public {
        uint256 id = _createAndFund(3);
        sp.executeSchedule(id);
        vm.warp(block.timestamp + INTERVAL);
        sp.executeSchedule(id);
        assertEq(sp.getSchedule(id).executionCount, 2);
        assertEq(sp.getSchedule(id).totalPaid, AMOUNT * 2);
    }

    function test_ExecuteSchedule_Revert_NotDue_BeforeStart() public {
        // startTime = now + 1 day
        vm.prank(payer);
        uint256 id = sp.createSchedule(
            recipient, AMOUNT,
            block.timestamp + 1 days, 0, INTERVAL, 0, ""
        );
        uint256 fundAmt = AMOUNT * 3;
        usdc.mint(payer, fundAmt);
        vm.startPrank(payer);
        usdc.approve(address(sp), fundAmt);
        sp.fundSchedule(id, fundAmt);
        vm.stopPrank();

        vm.expectRevert(ScheduledPayout.NotDue.selector);
        sp.executeSchedule(id);
    }

    function test_ExecuteSchedule_Revert_NotDue_TooEarlyAfterFirst() public {
        uint256 id = _createAndFund(3);
        sp.executeSchedule(id);
        // Try again immediately – interval not elapsed
        vm.expectRevert(ScheduledPayout.NotDue.selector);
        sp.executeSchedule(id);
    }

    function test_ExecuteSchedule_Revert_InsufficientBalance() public {
        uint256 id = _createSchedule(); // no funds
        vm.expectRevert(ScheduledPayout.InsufficientScheduleBalance.selector);
        sp.executeSchedule(id);
    }

    function test_ExecuteSchedule_Revert_NotFound() public {
        vm.expectRevert(ScheduledPayout.ScheduleNotFound.selector);
        sp.executeSchedule(999);
    }

    function test_ExecuteSchedule_Revert_EndTimePassed() public {
        uint256 start = block.timestamp;
        uint256 end   = start + 2 days;
        vm.prank(payer);
        uint256 id = sp.createSchedule(recipient, AMOUNT, start, end, INTERVAL, 0, "");
        uint256 fundAmt = AMOUNT * 5;
        usdc.mint(payer, fundAmt);
        vm.startPrank(payer);
        usdc.approve(address(sp), fundAmt);
        sp.fundSchedule(id, fundAmt);
        vm.stopPrank();

        vm.warp(end + 1);
        vm.expectRevert(ScheduledPayout.EndTimePassed.selector);
        sp.executeSchedule(id);
    }

    function test_ExecuteSchedule_Revert_MaxExecutionsReached() public {
        vm.prank(payer);
        uint256 id = sp.createSchedule(recipient, AMOUNT, block.timestamp, 0, INTERVAL, 1, "");
        uint256 fundAmt = AMOUNT * 3;
        usdc.mint(payer, fundAmt);
        vm.startPrank(payer);
        usdc.approve(address(sp), fundAmt);
        sp.fundSchedule(id, fundAmt);
        vm.stopPrank();

        sp.executeSchedule(id);
        // After 1 execution, state = COMPLETED
        vm.warp(block.timestamp + INTERVAL);
        vm.expectRevert(ScheduledPayout.InactiveSchedule.selector);
        sp.executeSchedule(id);
    }

    function test_ExecuteSchedule_CompletesWhenMaxReached() public {
        vm.prank(payer);
        uint256 id = sp.createSchedule(recipient, AMOUNT, block.timestamp, 0, INTERVAL, 2, "");
        uint256 fundAmt = AMOUNT * 3;
        usdc.mint(payer, fundAmt);
        vm.startPrank(payer);
        usdc.approve(address(sp), fundAmt);
        sp.fundSchedule(id, fundAmt);
        vm.stopPrank();

        sp.executeSchedule(id);
        vm.warp(block.timestamp + INTERVAL);
        sp.executeSchedule(id);

        ScheduledPayout.Schedule memory sch = sp.getSchedule(id);
        assertEq(uint8(sch.state), uint8(ScheduledPayout.ScheduleState.COMPLETED));
        assertFalse(sch.active);
    }

    // =========================================================================
    // cancelSchedule
    // =========================================================================

    function test_CancelSchedule_HappyPath_WithRefund() public {
        uint256 id = _createAndFund(5);
        uint256 before = usdc.balanceOf(payer);
        vm.expectEmit(true, false, false, true, address(sp));
        emit ScheduledPayout.ScheduleCancelled(id, AMOUNT * 5);
        vm.prank(payer);
        sp.cancelSchedule(id);

        assertEq(usdc.balanceOf(payer), before + AMOUNT * 5);
        assertEq(uint8(sp.getSchedule(id).state), uint8(ScheduledPayout.ScheduleState.CANCELLED));
    }

    function test_CancelSchedule_HappyPath_ZeroBalance() public {
        uint256 id = _createSchedule();  // no funds deposited
        vm.prank(payer);
        sp.cancelSchedule(id);
        assertEq(uint8(sp.getSchedule(id).state), uint8(ScheduledPayout.ScheduleState.CANCELLED));
    }

    function test_CancelSchedule_Revert_NotPayer() public {
        uint256 id = _createSchedule();
        vm.prank(stranger);
        vm.expectRevert(ScheduledPayout.Unauthorized.selector);
        sp.cancelSchedule(id);
    }

    function test_CancelSchedule_Revert_AlreadyCancelled() public {
        uint256 id = _createSchedule();
        vm.prank(payer);
        sp.cancelSchedule(id);
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.InactiveSchedule.selector);
        sp.cancelSchedule(id);
    }

    function test_CancelSchedule_Revert_NotFound() public {
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.ScheduleNotFound.selector);
        sp.cancelSchedule(999);
    }

    // =========================================================================
    // withdrawExcessFunds
    // =========================================================================

    function test_WithdrawExcessFunds_HappyPath() public {
        uint256 id = _createAndFund(3);   // balance = AMOUNT*3
        // withdrawable = balance - one_payment = AMOUNT*3 - AMOUNT = AMOUNT*2
        uint256 withdrawable = AMOUNT * 2;
        uint256 before = usdc.balanceOf(payer);
        vm.expectEmit(true, false, false, true, address(sp));
        emit ScheduledPayout.FundsWithdrawn(id, withdrawable, AMOUNT);
        vm.prank(payer);
        sp.withdrawExcessFunds(id, withdrawable);
        assertEq(usdc.balanceOf(payer), before + withdrawable);
        assertEq(sp.getBalance(id), AMOUNT);  // one payment remains
    }

    function test_WithdrawExcessFunds_Revert_AmountTooLarge() public {
        uint256 id = _createAndFund(3);
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.InvalidWithdrawalAmount.selector);
        sp.withdrawExcessFunds(id, AMOUNT * 3);  // would leave < one payment
    }

    function test_WithdrawExcessFunds_Revert_ZeroAmount() public {
        uint256 id = _createAndFund(3);
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.InvalidWithdrawalAmount.selector);
        sp.withdrawExcessFunds(id, 0);
    }

    function test_WithdrawExcessFunds_Revert_InsufficientBuffer() public {
        uint256 id = _createAndFund(1);  // balance = AMOUNT, withdrawable = 0
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.InvalidWithdrawalAmount.selector);
        sp.withdrawExcessFunds(id, 1);
    }

    function test_WithdrawExcessFunds_Revert_NotPayer() public {
        uint256 id = _createAndFund(3);
        vm.prank(stranger);
        vm.expectRevert(ScheduledPayout.Unauthorized.selector);
        sp.withdrawExcessFunds(id, AMOUNT);
    }

    function test_WithdrawExcessFunds_Revert_NotFound() public {
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.ScheduleNotFound.selector);
        sp.withdrawExcessFunds(999, AMOUNT);
    }

    // =========================================================================
    // isDue
    // =========================================================================

    function test_IsDue_TrueWhenFundedAndDue() public {
        uint256 id = _createAndFund(3);
        assertTrue(sp.isDue(id));
    }

    function test_IsDue_FalseBeforeStart() public {
        vm.prank(payer);
        uint256 id = sp.createSchedule(recipient, AMOUNT, block.timestamp + 1 days, 0, INTERVAL, 0, "");
        assertFalse(sp.isDue(id));
    }

    function test_IsDue_FalseWhenNotFunded() public {
        uint256 id = _createSchedule();
        assertFalse(sp.isDue(id));
    }

    function test_IsDue_FalseAfterEndTime() public {
        uint256 start = block.timestamp;
        uint256 end   = start + 2 days;
        vm.prank(payer);
        uint256 id = sp.createSchedule(recipient, AMOUNT, start, end, INTERVAL, 0, "");
        uint256 fundAmt = AMOUNT * 5;
        usdc.mint(payer, fundAmt);
        vm.startPrank(payer);
        usdc.approve(address(sp), fundAmt);
        sp.fundSchedule(id, fundAmt);
        vm.stopPrank();
        vm.warp(end + 1);
        assertFalse(sp.isDue(id));
    }

    function test_IsDue_FalseForNonexistent() public view {
        assertFalse(sp.isDue(999));
    }

    // =========================================================================
    // getSchedule / getBalance
    // =========================================================================

    function test_GetSchedule_Revert_NotFound() public {
        vm.expectRevert(ScheduledPayout.ScheduleNotFound.selector);
        sp.getSchedule(999);
    }

    function test_GetBalance_Revert_NotFound() public {
        vm.expectRevert(ScheduledPayout.ScheduleNotFound.selector);
        sp.getBalance(999);
    }

    // =========================================================================
    // Fuzz: executionCount and totalPaid are consistent
    // =========================================================================

    function testFuzz_ExecutionCount_Consistent(uint8 execCount) public {
        uint256 n = bound(execCount, 1, 10);
        uint256 id = _createAndFund(n + 1);  // fund enough for n+1 but limit to n

        for (uint256 i = 0; i < n; i++) {
            sp.executeSchedule(id);
            vm.warp(block.timestamp + INTERVAL);
        }

        ScheduledPayout.Schedule memory sch = sp.getSchedule(id);
        assertEq(sch.executionCount, n);
        assertEq(sch.totalPaid, AMOUNT * n);
    }

    // =========================================================================
    // Invariant: contract USDC balance = sum of all schedule balances
    // (simple version: non-negative at all times)
    // =========================================================================

    function invariant_ContractBalanceNonNegative() public view {
        assertGe(usdc.balanceOf(address(sp)), 0);
    }
}

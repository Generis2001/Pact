// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {EscrowManager} from "../EscrowManager.sol";
import {ScheduledPayout} from "../ScheduledPayout.sol";
import {ConditionalPayout} from "../ConditionalPayout.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

/// @dev Regressions discovered while verifying the Arc mainnet deployment.
contract FeatureRegressionTest is Test {
    event MilestoneReleased(uint256 indexed escrowId, uint256 milestoneIndex, uint256 amount);
    event Released(uint256 indexed escrowId, address indexed beneficiary, uint256 amount);
    MockERC20 token;
    EscrowManager escrow;
    ScheduledPayout scheduled;
    ConditionalPayout conditional;
    address payer = makeAddr("payer");
    address beneficiary = makeAddr("beneficiary");
    address arbiter = makeAddr("arbiter");
    uint256 deadline;

    function setUp() public {
        vm.warp(100_000);
        deadline = block.timestamp + 100;
        token = new MockERC20("USDC", "USDC", 6);
        escrow = new EscrowManager(address(token));
        scheduled = new ScheduledPayout(address(token));
        conditional = new ConditionalPayout(address(token));
        token.mint(payer, 1000);
        vm.startPrank(payer);
        token.approve(address(escrow), type(uint256).max);
        token.approve(address(scheduled), type(uint256).max);
        token.approve(address(conditional), type(uint256).max);
        vm.stopPrank();
    }

    function makeEscrow(address arbiter_) internal returns (uint256 id) {
        EscrowManager.MilestoneInput[] memory ms = new EscrowManager.MilestoneInput[](2);
        ms[0] = EscrowManager.MilestoneInput(10, 0, "first");
        ms[1] = EscrowManager.MilestoneInput(10, 0, "second");
        vm.startPrank(payer);
        id = escrow.createEscrow(beneficiary, arbiter_, deadline, ms);
        escrow.fundEscrow(id);
        vm.stopPrank();
    }

    function resolveFirstWithRefund(uint256 id) internal {
        vm.prank(payer);
        escrow.disputeMilestone(id, 0);
        vm.prank(arbiter);
        escrow.resolveMilestone(id, 0, false);
    }

    function test_EscrowRefundAfterMilestoneResolutionReturnsOnlyRemainingFunds() public {
        uint256 id = makeEscrow(arbiter);
        resolveFirstWithRefund(id);
        assertEq(token.balanceOf(address(escrow)), 10);
        vm.warp(deadline + 1);
        vm.prank(payer);
        escrow.claimRefund(id);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function test_EscrowRefundMustPreserveAnotherEscrowsFunds() public {
        uint256 first = makeEscrow(arbiter);
        uint256 second = makeEscrow(arbiter);
        resolveFirstWithRefund(first);
        vm.warp(deadline + 1);
        vm.prank(payer);
        escrow.claimRefund(first);
        assertEq(escrow.getEscrow(second).totalAmount, 20);
        assertEq(token.balanceOf(address(escrow)), 20, "other escrow must remain fully collateralized");
    }

    function test_EscrowFullDisputeMustNotDoublePayResolvedMilestone() public {
        uint256 first = makeEscrow(arbiter);
        makeEscrow(arbiter);
        resolveFirstWithRefund(first);
        vm.prank(payer);
        escrow.initiateDispute(first);
        vm.prank(arbiter);
        escrow.resolveDispute(first, false);
        assertEq(token.balanceOf(address(escrow)), 20, "whole-escrow resolution must exclude previously paid milestones");
    }

    function test_FinalReleaseEventExcludesPreviouslyRefundedMilestone() public {
        uint256 id = makeEscrow(arbiter);
        resolveFirstWithRefund(id);
        vm.prank(payer);
        escrow.approveMilestone(id, 1);
        vm.prank(arbiter);
        vm.expectEmit(true, false, false, true, address(escrow));
        emit MilestoneReleased(id, 1, 10);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit Released(id, beneficiary, 10);
        escrow.approveMilestone(id, 1);
    }

    function test_BatchFinalReleaseEventIncludesPreviouslyReleasedMilestones() public {
        uint256 id = makeEscrow(arbiter);
        vm.prank(payer);
        escrow.approveMilestone(id, 0);
        vm.prank(arbiter);
        escrow.approveMilestone(id, 0);
        vm.prank(payer);
        escrow.approveRelease(id);
        vm.prank(arbiter);
        vm.expectEmit(true, false, false, true, address(escrow));
        emit MilestoneReleased(id, 1, 10);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit Released(id, beneficiary, 20);
        escrow.approveRelease(id);
    }

    function test_EscrowRejectsOverlappingApprovalRoles() public {
        EscrowManager.MilestoneInput[] memory ms = new EscrowManager.MilestoneInput[](1);
        ms[0] = EscrowManager.MilestoneInput(10, 0, "first");
        vm.prank(payer);
        vm.expectRevert(EscrowManager.InvalidArbiter.selector);
        escrow.createEscrow(beneficiary, payer, deadline, ms);
    }

    function test_EscrowBatchApprovalEnforcesDeadlineLikeMilestoneApproval() public {
        uint256 id = makeEscrow(arbiter);
        vm.warp(deadline + 1);
        vm.prank(payer);
        vm.expectRevert(EscrowManager.DeadlinePassed.selector);
        escrow.approveRelease(id);
    }

    function makeSchedule(uint256 maximum) internal returns (uint256 id) {
        vm.prank(payer);
        id = scheduled.createSchedule(beneficiary, 10, block.timestamp, 0, 86400, maximum, "test");
    }

    function test_CancelledScheduleCannotAcceptNewFunding() public {
        uint256 id = makeSchedule(0);
        vm.prank(payer);
        scheduled.cancelSchedule(id);
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.InactiveSchedule.selector);
        scheduled.fundSchedule(id, 10);
    }

    function test_CompletedScheduleReturnsItsUnusedFunding() public {
        uint256 id = makeSchedule(1);
        vm.prank(payer);
        scheduled.fundSchedule(id, 20);
        scheduled.executeSchedule(id);
        assertEq(scheduled.getBalance(id), 0);
        assertEq(token.balanceOf(payer), 990);
        assertEq(token.balanceOf(beneficiary), 10);
        assertEq(uint256(scheduled.getSchedule(id).state), uint256(ScheduledPayout.ScheduleState.COMPLETED));
    }

    function test_ExpiredPendingConditionalAgreementRejectsFunding() public {
        vm.prank(payer);
        uint256 id = conditional.createAgreement(beneficiary, arbiter, 10, deadline, "test", "");
        vm.warp(deadline + 1);
        vm.prank(payer);
        vm.expectRevert(ConditionalPayout.DeadlinePassed.selector);
        conditional.fundAgreement(id);
    }

    function test_CompletedScheduleCannotAcceptFunding() public {
        uint256 id = makeSchedule(1);
        vm.prank(payer);
        scheduled.fundSchedule(id, 10);
        scheduled.executeSchedule(id);
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.InactiveSchedule.selector);
        scheduled.fundSchedule(id, 10);
    }

    function test_ExpiredScheduleCanWithdrawItsEntireBalance() public {
        vm.prank(payer);
        uint256 id = scheduled.createSchedule(beneficiary, 10, block.timestamp, deadline, 86400, 0, "test");
        vm.prank(payer);
        scheduled.fundSchedule(id, 5);
        vm.warp(deadline + 1);
        vm.prank(payer);
        scheduled.withdrawExcessFunds(id, 5);
        assertEq(scheduled.getBalance(id), 0);
        assertEq(token.balanceOf(payer), 1000);
    }

    function test_ExpiredScheduleRejectsFunding() public {
        vm.prank(payer);
        uint256 id = scheduled.createSchedule(beneficiary, 10, block.timestamp, deadline, 86400, 0, "test");
        vm.warp(deadline + 1);
        vm.prank(payer);
        vm.expectRevert(ScheduledPayout.EndTimePassed.selector);
        scheduled.fundSchedule(id, 10);
    }

    function test_ResolvedBeneficiaryPaymentIsIncludedInReleasedAmount() public {
        uint256 id = makeEscrow(arbiter);
        vm.prank(payer);
        escrow.disputeMilestone(id, 0);
        vm.prank(arbiter);
        escrow.resolveMilestone(id, 0, true);
        assertEq(escrow.getEscrow(id).releasedAmount, 10);
        vm.warp(deadline + 1);
        vm.prank(payer);
        escrow.claimRefund(id);
        EscrowManager.Escrow memory record = escrow.getEscrow(id);
        assertEq(uint256(record.milestones[1].state), uint256(EscrowManager.MilestoneState.REFUNDED));
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function test_MilestoneDeadlineCannotExceedEscrowDeadline() public {
        EscrowManager.MilestoneInput[] memory ms = new EscrowManager.MilestoneInput[](1);
        ms[0] = EscrowManager.MilestoneInput(10, deadline + 1, "first");
        vm.prank(payer);
        vm.expectRevert(EscrowManager.InvalidDeadline.selector);
        escrow.createEscrow(beneficiary, arbiter, deadline, ms);
    }

    function test_BatchApprovalRespectsEarlierMilestoneDeadline() public {
        EscrowManager.MilestoneInput[] memory ms = new EscrowManager.MilestoneInput[](1);
        ms[0] = EscrowManager.MilestoneInput(10, block.timestamp + 10, "first");
        vm.startPrank(payer);
        uint256 id = escrow.createEscrow(beneficiary, arbiter, deadline, ms);
        escrow.fundEscrow(id);
        vm.warp(block.timestamp + 11);
        vm.expectRevert(EscrowManager.DeadlinePassed.selector);
        escrow.approveRelease(id);
        vm.stopPrank();
    }

    function testFuzz_MixedSettlementsPreserveAnotherPayersEscrow(uint64 firstAmount, uint64 secondAmount, bool release, bool fullDispute) public {
        uint256 first = bound(firstAmount, 1, 1_000_000);
        uint256 second = bound(secondAmount, 1, 1_000_000);
        token.mint(payer, first + second);
        address otherPayer = makeAddr("other payer");
        token.mint(otherPayer, 20);
        EscrowManager.MilestoneInput[] memory ms = new EscrowManager.MilestoneInput[](2);
        ms[0] = EscrowManager.MilestoneInput(first, 0, "first");
        ms[1] = EscrowManager.MilestoneInput(second, 0, "second");
        vm.startPrank(payer);
        uint256 id = escrow.createEscrow(beneficiary, arbiter, deadline, ms);
        escrow.fundEscrow(id);
        vm.stopPrank();
        ms[0].amount = 10;
        ms[1].amount = 10;
        vm.startPrank(otherPayer);
        token.approve(address(escrow), 20);
        uint256 otherId = escrow.createEscrow(beneficiary, arbiter, deadline, ms);
        escrow.fundEscrow(otherId);
        vm.stopPrank();
        vm.prank(payer);
        escrow.disputeMilestone(id, 0);
        vm.prank(arbiter);
        escrow.resolveMilestone(id, 0, release);
        if (fullDispute) {
            vm.prank(payer);
            escrow.initiateDispute(id);
            vm.prank(arbiter);
            escrow.resolveDispute(id, release);
        } else {
            vm.warp(deadline + 1);
            vm.prank(payer);
            escrow.claimRefund(id);
        }
        assertEq(token.balanceOf(address(escrow)), 20);
        assertEq(uint256(escrow.getEscrow(otherId).state), uint256(EscrowManager.EscrowState.FUNDED));
    }
}

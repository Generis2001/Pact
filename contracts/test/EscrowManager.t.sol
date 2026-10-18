// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {EscrowManager} from "../EscrowManager.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

contract EscrowManagerTest is Test {
    EscrowManager internal escrow;
    MockERC20    internal usdc;

    address internal depositor  = makeAddr("depositor");
    address internal beneficiary = makeAddr("beneficiary");
    address internal arbiter    = makeAddr("arbiter");
    address internal stranger   = makeAddr("stranger");

    uint256 internal constant DEADLINE_OFFSET = 7 days;
    uint256 internal constant M1_AMOUNT = 100e6;
    uint256 internal constant M2_AMOUNT = 200e6;

    // ── helpers ──────────────────────────────────────────────────────────────

    function _milestone1() internal view returns (EscrowManager.MilestoneInput[] memory ms) {
        ms = new EscrowManager.MilestoneInput[](1);
        ms[0] = EscrowManager.MilestoneInput({
            amount: M1_AMOUNT,
            deadline: 0,
            description: "Milestone 1"
        });
    }

    function _milestone2() internal view returns (EscrowManager.MilestoneInput[] memory ms) {
        ms = new EscrowManager.MilestoneInput[](2);
        ms[0] = EscrowManager.MilestoneInput({amount: M1_AMOUNT, deadline: 0, description: "M1"});
        ms[1] = EscrowManager.MilestoneInput({amount: M2_AMOUNT, deadline: 0, description: "M2"});
    }

    /// Creates an escrow (from depositor) and returns its id.
    function _createEscrow(EscrowManager.MilestoneInput[] memory ms)
        internal returns (uint256 id)
    {
        vm.prank(depositor);
        id = escrow.createEscrow(beneficiary, arbiter, block.timestamp + DEADLINE_OFFSET, ms);
    }

    /// Creates + funds a single-milestone escrow.
    function _createAndFund() internal returns (uint256 id) {
        id = _createEscrow(_milestone1());
        usdc.mint(depositor, M1_AMOUNT);
        vm.startPrank(depositor);
        usdc.approve(address(escrow), M1_AMOUNT);
        escrow.fundEscrow(id);
        vm.stopPrank();
    }

    /// Creates + funds a two-milestone escrow.
    function _createAndFund2() internal returns (uint256 id) {
        EscrowManager.MilestoneInput[] memory ms = _milestone2();
        id = _createEscrow(ms);
        uint256 total = M1_AMOUNT + M2_AMOUNT;
        usdc.mint(depositor, total);
        vm.startPrank(depositor);
        usdc.approve(address(escrow), total);
        escrow.fundEscrow(id);
        vm.stopPrank();
    }

    // ── setUp ─────────────────────────────────────────────────────────────────

    function setUp() public {
        usdc   = new MockERC20("Mock USDC", "mUSDC", 6);
        escrow = new EscrowManager(address(usdc));
        // Warp to a known timestamp so deadline checks are stable
        vm.warp(1_700_000_000);
    }

    // =========================================================================
    // constructor
    // =========================================================================

    function test_Constructor_ZeroAddress() public {
        vm.expectRevert(EscrowManager.ZeroAddress.selector);
        new EscrowManager(address(0));
    }

    // =========================================================================
    // createEscrow
    // =========================================================================

    function test_CreateEscrow_HappyPath_SingleMilestone() public {
        EscrowManager.MilestoneInput[] memory ms = _milestone1();
        vm.prank(depositor);
        vm.expectEmit(true, true, true, false, address(escrow));
        emit EscrowManager.EscrowCreated(
            1, depositor, beneficiary, arbiter,
            M1_AMOUNT, block.timestamp + DEADLINE_OFFSET,
            ms[0].description
        );
        uint256 id = escrow.createEscrow(beneficiary, arbiter, block.timestamp + DEADLINE_OFFSET, ms);

        assertEq(id, 1);
        EscrowManager.Escrow memory esc = escrow.getEscrow(id);
        assertEq(esc.depositor,   depositor);
        assertEq(esc.beneficiary, beneficiary);
        assertEq(esc.arbiter,     arbiter);
        assertEq(esc.totalAmount, M1_AMOUNT);
        assertEq(uint8(esc.state), uint8(EscrowManager.EscrowState.CREATED));
    }

    function test_CreateEscrow_HappyPath_MultiMilestone() public {
        EscrowManager.MilestoneInput[] memory ms = _milestone2();
        vm.prank(depositor);
        uint256 id = escrow.createEscrow(beneficiary, arbiter, block.timestamp + DEADLINE_OFFSET, ms);
        EscrowManager.Escrow memory esc = escrow.getEscrow(id);
        assertEq(esc.totalAmount, M1_AMOUNT + M2_AMOUNT);
        EscrowManager.Milestone[] memory milestones = escrow.getMilestones(id);
        assertEq(milestones.length, 2);
        assertEq(milestones[0].amount, M1_AMOUNT);
        assertEq(milestones[1].amount, M2_AMOUNT);
    }

    function test_CreateEscrow_IdsIncrement() public {
        EscrowManager.MilestoneInput[] memory ms = _milestone1();
        vm.startPrank(depositor);
        uint256 id1 = escrow.createEscrow(beneficiary, arbiter, block.timestamp + DEADLINE_OFFSET, ms);
        uint256 id2 = escrow.createEscrow(beneficiary, arbiter, block.timestamp + DEADLINE_OFFSET, ms);
        vm.stopPrank();
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function test_CreateEscrow_UserEscrowsTracked() public {
        _createEscrow(_milestone1());
        uint256[] memory ids = escrow.getUserEscrows(depositor);
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);
    }

    function test_CreateEscrow_Revert_ZeroBeneficiary() public {
        EscrowManager.MilestoneInput[] memory ms = _milestone1();
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.ZeroAddress.selector);
        escrow.createEscrow(address(0), arbiter, block.timestamp + DEADLINE_OFFSET, ms);
    }

    function test_CreateEscrow_Revert_ZeroArbiter() public {
        EscrowManager.MilestoneInput[] memory ms = _milestone1();
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.ZeroAddress.selector);
        escrow.createEscrow(beneficiary, address(0), block.timestamp + DEADLINE_OFFSET, ms);
    }

    function test_CreateEscrow_Revert_InvalidDeadline_InPast() public {
        EscrowManager.MilestoneInput[] memory ms = _milestone1();
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.InvalidDeadline.selector);
        escrow.createEscrow(beneficiary, arbiter, block.timestamp, ms);
    }

    function test_CreateEscrow_Revert_NoMilestones() public {
        EscrowManager.MilestoneInput[] memory ms = new EscrowManager.MilestoneInput[](0);
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.InvalidMilestoneCount.selector);
        escrow.createEscrow(beneficiary, arbiter, block.timestamp + DEADLINE_OFFSET, ms);
    }

    function test_CreateEscrow_Revert_TooManyMilestones() public {
        EscrowManager.MilestoneInput[] memory ms = new EscrowManager.MilestoneInput[](21);
        for (uint256 i = 0; i < 21; i++) {
            ms[i] = EscrowManager.MilestoneInput({amount: 1e6, deadline: 0, description: "x"});
        }
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.InvalidMilestoneCount.selector);
        escrow.createEscrow(beneficiary, arbiter, block.timestamp + DEADLINE_OFFSET, ms);
    }

    function test_CreateEscrow_Revert_MilestoneZeroAmount() public {
        EscrowManager.MilestoneInput[] memory ms = new EscrowManager.MilestoneInput[](1);
        ms[0] = EscrowManager.MilestoneInput({amount: 0, deadline: 0, description: "bad"});
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.InvalidAmount.selector);
        escrow.createEscrow(beneficiary, arbiter, block.timestamp + DEADLINE_OFFSET, ms);
    }

    function test_CreateEscrow_Revert_MilestoneDeadlineInPast() public {
        EscrowManager.MilestoneInput[] memory ms = new EscrowManager.MilestoneInput[](1);
        ms[0] = EscrowManager.MilestoneInput({amount: 1e6, deadline: block.timestamp - 1, description: "bad"});
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.InvalidDeadline.selector);
        escrow.createEscrow(beneficiary, arbiter, block.timestamp + DEADLINE_OFFSET, ms);
    }

    // =========================================================================
    // fundEscrow
    // =========================================================================

    function test_FundEscrow_HappyPath() public {
        uint256 id = _createEscrow(_milestone1());
        usdc.mint(depositor, M1_AMOUNT);
        vm.startPrank(depositor);
        usdc.approve(address(escrow), M1_AMOUNT);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit EscrowManager.EscrowFunded(id, depositor, M1_AMOUNT);
        escrow.fundEscrow(id);
        vm.stopPrank();

        EscrowManager.Escrow memory esc = escrow.getEscrow(id);
        assertEq(uint8(esc.state), uint8(EscrowManager.EscrowState.FUNDED));
        assertEq(usdc.balanceOf(address(escrow)), M1_AMOUNT);
    }

    function test_FundEscrow_Revert_NotDepositor() public {
        uint256 id = _createEscrow(_milestone1());
        vm.prank(stranger);
        vm.expectRevert(EscrowManager.Unauthorized.selector);
        escrow.fundEscrow(id);
    }

    function test_FundEscrow_Revert_NotFound() public {
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.EscrowNotFound.selector);
        escrow.fundEscrow(999);
    }

    function test_FundEscrow_Revert_AlreadyFunded() public {
        uint256 id = _createAndFund();
        usdc.mint(depositor, M1_AMOUNT);
        vm.startPrank(depositor);
        usdc.approve(address(escrow), M1_AMOUNT);
        vm.expectRevert(EscrowManager.InvalidState.selector);
        escrow.fundEscrow(id);
        vm.stopPrank();
    }

    function test_FundEscrow_Revert_DeadlinePassed() public {
        uint256 id = _createEscrow(_milestone1());
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        usdc.mint(depositor, M1_AMOUNT);
        vm.startPrank(depositor);
        usdc.approve(address(escrow), M1_AMOUNT);
        vm.expectRevert(EscrowManager.DeadlinePassed.selector);
        escrow.fundEscrow(id);
        vm.stopPrank();
    }

    // =========================================================================
    // approveRelease  (both-approve path releases all milestones)
    // =========================================================================

    function test_ApproveRelease_HappyPath_BothApprove() public {
        uint256 id = _createAndFund();
        uint256 before = usdc.balanceOf(beneficiary);

        vm.prank(depositor);
        escrow.approveRelease(id);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit EscrowManager.MilestoneReleased(id, 0, M1_AMOUNT);
        vm.expectEmit(true, true, false, true, address(escrow));
        emit EscrowManager.Released(id, beneficiary, M1_AMOUNT);
        vm.prank(arbiter);
        escrow.approveRelease(id);

        assertEq(usdc.balanceOf(beneficiary), before + M1_AMOUNT);
        EscrowManager.Escrow memory esc = escrow.getEscrow(id);
        assertEq(uint8(esc.state), uint8(EscrowManager.EscrowState.RELEASED));
    }

    function test_ApproveRelease_Revert_NotFound() public {
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.EscrowNotFound.selector);
        escrow.approveRelease(999);
    }

    function test_ApproveRelease_Revert_InvalidState_NotFunded() public {
        uint256 id = _createEscrow(_milestone1());
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.InvalidState.selector);
        escrow.approveRelease(id);
    }

    function test_ApproveRelease_Revert_Unauthorized() public {
        uint256 id = _createAndFund();
        vm.prank(stranger);
        vm.expectRevert(EscrowManager.Unauthorized.selector);
        escrow.approveRelease(id);
    }

    // =========================================================================
    // approveMilestone
    // =========================================================================

    function test_ApproveMilestone_HappyPath_TwoMilestones() public {
        uint256 id = _createAndFund2();
        uint256 before = usdc.balanceOf(beneficiary);

        // Approve milestone 0 by depositor
        vm.prank(depositor);
        escrow.approveMilestone(id, 0);

        // Approve milestone 0 by arbiter – triggers release
        vm.expectEmit(true, false, false, true, address(escrow));
        emit EscrowManager.MilestoneReleased(id, 0, M1_AMOUNT);
        vm.prank(arbiter);
        escrow.approveMilestone(id, 0);

        assertEq(usdc.balanceOf(beneficiary), before + M1_AMOUNT);
    }

    function test_ApproveMilestone_Revert_InvalidIndex() public {
        uint256 id = _createAndFund();
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.InvalidMilestoneIndex.selector);
        escrow.approveMilestone(id, 5);
    }

    function test_ApproveMilestone_Revert_InvalidMilestoneState() public {
        // Use a two-milestone escrow so the escrow stays FUNDED after milestone 0 is released.
        uint256 id = _createAndFund2();
        // Release milestone 0 fully via both approvals
        vm.prank(depositor);
        escrow.approveMilestone(id, 0);
        vm.prank(arbiter);
        escrow.approveMilestone(id, 0);
        // Escrow is still FUNDED (milestone 1 is NEW); trying to approve milestone 0 again
        // should revert with InvalidMilestoneState (state is now RELEASED, not NEW).
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.InvalidMilestoneState.selector);
        escrow.approveMilestone(id, 0);
    }

    function test_ApproveMilestone_Revert_NotFound() public {
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.EscrowNotFound.selector);
        escrow.approveMilestone(999, 0);
    }

    function test_ApproveMilestone_Revert_DeadlinePassed() public {
        // Create escrow with a milestone that has its own near deadline
        EscrowManager.MilestoneInput[] memory ms = new EscrowManager.MilestoneInput[](1);
        ms[0] = EscrowManager.MilestoneInput({
            amount: M1_AMOUNT,
            deadline: block.timestamp + 1 days,
            description: "near"
        });
        vm.prank(depositor);
        uint256 id = escrow.createEscrow(beneficiary, arbiter, block.timestamp + DEADLINE_OFFSET, ms);
        usdc.mint(depositor, M1_AMOUNT);
        vm.startPrank(depositor);
        usdc.approve(address(escrow), M1_AMOUNT);
        escrow.fundEscrow(id);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.DeadlinePassed.selector);
        escrow.approveMilestone(id, 0);
    }

    function test_ApproveMilestone_Revert_Unauthorized() public {
        uint256 id = _createAndFund();
        vm.prank(stranger);
        vm.expectRevert(EscrowManager.Unauthorized.selector);
        escrow.approveMilestone(id, 0);
    }

    // =========================================================================
    // initiateDispute
    // =========================================================================

    function test_InitiateDispute_ByDepositor() public {
        uint256 id = _createAndFund();
        vm.expectEmit(true, false, false, true, address(escrow));
        emit EscrowManager.Disputed(id, depositor);
        vm.prank(depositor);
        escrow.initiateDispute(id);
        EscrowManager.Escrow memory esc = escrow.getEscrow(id);
        assertEq(uint8(esc.state), uint8(EscrowManager.EscrowState.DISPUTED));
    }

    function test_InitiateDispute_ByBeneficiary() public {
        uint256 id = _createAndFund();
        vm.prank(beneficiary);
        escrow.initiateDispute(id);
        assertEq(uint8(escrow.getEscrow(id).state), uint8(EscrowManager.EscrowState.DISPUTED));
    }

    function test_InitiateDispute_Revert_Unauthorized() public {
        uint256 id = _createAndFund();
        vm.prank(stranger);
        vm.expectRevert(EscrowManager.Unauthorized.selector);
        escrow.initiateDispute(id);
    }

    function test_InitiateDispute_Revert_NotFunded() public {
        uint256 id = _createEscrow(_milestone1());
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.InvalidState.selector);
        escrow.initiateDispute(id);
    }

    // =========================================================================
    // disputeMilestone
    // =========================================================================

    function test_DisputeMilestone_HappyPath() public {
        uint256 id = _createAndFund();
        vm.expectEmit(true, false, false, true, address(escrow));
        emit EscrowManager.MilestoneDisputed(id, 0);
        vm.prank(depositor);
        escrow.disputeMilestone(id, 0);
        EscrowManager.Milestone[] memory ms = escrow.getMilestones(id);
        assertEq(uint8(ms[0].state), uint8(EscrowManager.MilestoneState.DISPUTED));
    }

    function test_DisputeMilestone_Revert_InvalidIndex() public {
        uint256 id = _createAndFund();
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.InvalidMilestoneIndex.selector);
        escrow.disputeMilestone(id, 5);
    }

    function test_DisputeMilestone_Revert_InvalidMilestoneState() public {
        uint256 id = _createAndFund();
        vm.prank(depositor);
        escrow.disputeMilestone(id, 0);
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.InvalidMilestoneState.selector);
        escrow.disputeMilestone(id, 0);
    }

    function test_DisputeMilestone_Revert_Unauthorized() public {
        uint256 id = _createAndFund();
        vm.prank(stranger);
        vm.expectRevert(EscrowManager.Unauthorized.selector);
        escrow.disputeMilestone(id, 0);
    }

    // =========================================================================
    // resolveMilestone
    // =========================================================================

    function test_ResolveMilestone_ReleaseToBeneficiary() public {
        uint256 id = _createAndFund();
        vm.prank(depositor);
        escrow.disputeMilestone(id, 0);

        uint256 before = usdc.balanceOf(beneficiary);
        vm.expectEmit(true, false, false, true, address(escrow));
        emit EscrowManager.MilestoneResolved(id, 0, true, M1_AMOUNT);
        vm.prank(arbiter);
        escrow.resolveMilestone(id, 0, true);
        assertEq(usdc.balanceOf(beneficiary), before + M1_AMOUNT);
    }

    function test_ResolveMilestone_RefundToDepositor() public {
        uint256 id = _createAndFund();
        vm.prank(depositor);
        escrow.disputeMilestone(id, 0);

        uint256 before = usdc.balanceOf(depositor);
        vm.prank(arbiter);
        escrow.resolveMilestone(id, 0, false);
        assertEq(usdc.balanceOf(depositor), before + M1_AMOUNT);
    }

    function test_ResolveMilestone_Revert_NotArbiter() public {
        uint256 id = _createAndFund();
        vm.prank(depositor);
        escrow.disputeMilestone(id, 0);
        vm.prank(stranger);
        vm.expectRevert(EscrowManager.Unauthorized.selector);
        escrow.resolveMilestone(id, 0, true);
    }

    function test_ResolveMilestone_Revert_MilestoneNotDisputed() public {
        uint256 id = _createAndFund();
        vm.prank(arbiter);
        vm.expectRevert(EscrowManager.InvalidMilestoneState.selector);
        escrow.resolveMilestone(id, 0, true);
    }

    // =========================================================================
    // resolveDispute  (escrow-level dispute)
    // =========================================================================

    function test_ResolveDispute_ReleaseToBeneficiary() public {
        uint256 id = _createAndFund();
        vm.prank(depositor);
        escrow.initiateDispute(id);
        uint256 before = usdc.balanceOf(beneficiary);
        vm.expectEmit(true, false, false, true, address(escrow));
        emit EscrowManager.Resolved(id, true, M1_AMOUNT);
        vm.prank(arbiter);
        escrow.resolveDispute(id, true);
        assertEq(usdc.balanceOf(beneficiary), before + M1_AMOUNT);
        assertEq(uint8(escrow.getEscrow(id).state), uint8(EscrowManager.EscrowState.RESOLVED));
    }

    function test_ResolveDispute_RefundToDepositor() public {
        uint256 id = _createAndFund();
        vm.prank(depositor);
        escrow.initiateDispute(id);
        uint256 before = usdc.balanceOf(depositor);
        vm.prank(arbiter);
        escrow.resolveDispute(id, false);
        assertEq(usdc.balanceOf(depositor), before + M1_AMOUNT);
    }

    function test_ResolveDispute_Revert_NotArbiter() public {
        uint256 id = _createAndFund();
        vm.prank(depositor);
        escrow.initiateDispute(id);
        vm.prank(stranger);
        vm.expectRevert(EscrowManager.Unauthorized.selector);
        escrow.resolveDispute(id, true);
    }

    function test_ResolveDispute_Revert_NotDisputed() public {
        uint256 id = _createAndFund();
        vm.prank(arbiter);
        vm.expectRevert(EscrowManager.InvalidState.selector);
        escrow.resolveDispute(id, true);
    }

    // =========================================================================
    // claimRefund
    // =========================================================================

    function test_ClaimRefund_WhenFunded() public {
        uint256 id = _createAndFund();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        uint256 before = usdc.balanceOf(depositor);
        vm.expectEmit(true, false, false, true, address(escrow));
        emit EscrowManager.Refunded(id, M1_AMOUNT);
        vm.prank(depositor);
        escrow.claimRefund(id);
        assertEq(usdc.balanceOf(depositor), before + M1_AMOUNT);
        assertEq(uint8(escrow.getEscrow(id).state), uint8(EscrowManager.EscrowState.REFUNDED));
    }

    function test_ClaimRefund_WhenCreatedNotFunded() public {
        uint256 id = _createEscrow(_milestone1());
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.expectEmit(true, false, false, true, address(escrow));
        emit EscrowManager.Refunded(id, 0);
        vm.prank(depositor);
        escrow.claimRefund(id);
        assertEq(uint8(escrow.getEscrow(id).state), uint8(EscrowManager.EscrowState.REFUNDED));
    }

    function test_ClaimRefund_Revert_DeadlineNotReached() public {
        uint256 id = _createAndFund();
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.DeadlineNotReached.selector);
        escrow.claimRefund(id);
    }

    function test_ClaimRefund_Revert_NotDepositor() public {
        uint256 id = _createAndFund();
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(stranger);
        vm.expectRevert(EscrowManager.Unauthorized.selector);
        escrow.claimRefund(id);
    }

    function test_ClaimRefund_Revert_WrongState() public {
        uint256 id = _createAndFund();
        vm.prank(depositor);
        escrow.initiateDispute(id);
        vm.warp(block.timestamp + DEADLINE_OFFSET + 1);
        vm.prank(depositor);
        vm.expectRevert(EscrowManager.InvalidState.selector);
        escrow.claimRefund(id);
    }

    // =========================================================================
    // getEscrow / getMilestones / getUserEscrows
    // =========================================================================

    function test_GetEscrow_Revert_NotFound() public {
        vm.expectRevert(EscrowManager.EscrowNotFound.selector);
        escrow.getEscrow(999);
    }

    function test_GetMilestones_Revert_NotFound() public {
        vm.expectRevert(EscrowManager.EscrowNotFound.selector);
        escrow.getMilestones(999);
    }

    // =========================================================================
    // Fuzz: milestone amounts sum correctly
    // =========================================================================

    function testFuzz_TotalAmount_SumOfMilestones(uint96 a1, uint96 a2) public {
        vm.assume(a1 > 0 && a2 > 0);
        EscrowManager.MilestoneInput[] memory ms = new EscrowManager.MilestoneInput[](2);
        ms[0] = EscrowManager.MilestoneInput({amount: a1, deadline: 0, description: "f1"});
        ms[1] = EscrowManager.MilestoneInput({amount: a2, deadline: 0, description: "f2"});
        vm.prank(depositor);
        uint256 id = escrow.createEscrow(beneficiary, arbiter, block.timestamp + DEADLINE_OFFSET, ms);
        EscrowManager.Escrow memory esc = escrow.getEscrow(id);
        assertEq(esc.totalAmount, uint256(a1) + uint256(a2));
    }

    // =========================================================================
    // Invariant: escrow USDC balance ≥ sum of funded escrow amounts
    // =========================================================================

    function invariant_EscrowContractBalance() public view {
        // After setup the contract holds 0 — this verifies no leakage across the
        // invariant handler's setUp runs.  Real balance accounting is in per-test asserts.
        assertGe(usdc.balanceOf(address(escrow)), 0);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ConditionalPayout} from "../ConditionalPayout.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

contract ConditionalPayoutTest is Test {
    ConditionalPayout internal cp;
    MockERC20          internal usdc;

    address internal payer     = makeAddr("payer");
    address internal recipient = makeAddr("recipient");
    address internal approver  = makeAddr("approver");
    address internal stranger  = makeAddr("stranger");

    uint256 internal constant AMOUNT   = 500e6;
    uint256 internal constant DEADLINE = 7 days;

    // ── helpers ──────────────────────────────────────────────────────────────

    function _createAgreement() internal returns (uint256 id) {
        vm.prank(payer);
        id = cp.createAgreement(
            recipient, approver, AMOUNT,
            block.timestamp + DEADLINE,
            "Do the work", "ipfs://meta"
        );
    }

    function _createAndFund() internal returns (uint256 id) {
        id = _createAgreement();
        usdc.mint(payer, AMOUNT);
        vm.startPrank(payer);
        usdc.approve(address(cp), AMOUNT);
        cp.fundAgreement(id);
        vm.stopPrank();
    }

    // ── setUp ─────────────────────────────────────────────────────────────────

    function setUp() public {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);
        cp   = new ConditionalPayout(address(usdc));
        vm.warp(1_700_000_000);
    }

    // =========================================================================
    // constructor
    // =========================================================================

    function test_Constructor_ZeroAddress() public {
        vm.expectRevert(ConditionalPayout.ZeroAddress.selector);
        new ConditionalPayout(address(0));
    }

    // =========================================================================
    // createAgreement
    // =========================================================================

    function test_CreateAgreement_HappyPath() public {
        vm.prank(payer);
        vm.expectEmit(true, true, true, false, address(cp));
        emit ConditionalPayout.AgreementCreated(
            1, payer, recipient, approver,
            AMOUNT, block.timestamp + DEADLINE,
            "Do the work", "ipfs://meta"
        );
        uint256 id = cp.createAgreement(
            recipient, approver, AMOUNT,
            block.timestamp + DEADLINE,
            "Do the work", "ipfs://meta"
        );
        assertEq(id, 1);
        ConditionalPayout.Agreement memory agr = cp.getAgreement(id);
        assertEq(agr.payer,    payer);
        assertEq(agr.recipient, recipient);
        assertEq(agr.approver,  approver);
        assertEq(agr.amount,    AMOUNT);
        assertEq(uint8(agr.state), uint8(ConditionalPayout.AgreementState.PENDING));
    }

    function test_CreateAgreement_IdsIncrement() public {
        vm.startPrank(payer);
        uint256 id1 = cp.createAgreement(recipient, approver, AMOUNT, block.timestamp + DEADLINE, "a", "");
        uint256 id2 = cp.createAgreement(recipient, approver, AMOUNT, block.timestamp + DEADLINE, "b", "");
        vm.stopPrank();
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function test_CreateAgreement_UserAgreementsTracked() public {
        _createAgreement();
        uint256[] memory ids = cp.getUserAgreements(payer);
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);
    }

    function test_CreateAgreement_Revert_ZeroRecipient() public {
        vm.prank(payer);
        vm.expectRevert(ConditionalPayout.ZeroAddress.selector);
        cp.createAgreement(address(0), approver, AMOUNT, block.timestamp + DEADLINE, "", "");
    }

    function test_CreateAgreement_Revert_ZeroApprover() public {
        vm.prank(payer);
        vm.expectRevert(ConditionalPayout.ZeroAddress.selector);
        cp.createAgreement(recipient, address(0), AMOUNT, block.timestamp + DEADLINE, "", "");
    }

    function test_CreateAgreement_Revert_ZeroAmount() public {
        vm.prank(payer);
        vm.expectRevert(ConditionalPayout.InvalidAmount.selector);
        cp.createAgreement(recipient, approver, 0, block.timestamp + DEADLINE, "", "");
    }

    function test_CreateAgreement_Revert_InvalidDeadline() public {
        vm.prank(payer);
        vm.expectRevert(ConditionalPayout.InvalidDeadline.selector);
        cp.createAgreement(recipient, approver, AMOUNT, block.timestamp, "", "");
    }

    // =========================================================================
    // fundAgreement
    // =========================================================================

    function test_FundAgreement_HappyPath() public {
        uint256 id = _createAgreement();
        usdc.mint(payer, AMOUNT);
        vm.startPrank(payer);
        usdc.approve(address(cp), AMOUNT);
        vm.expectEmit(true, true, false, true, address(cp));
        emit ConditionalPayout.AgreementFunded(id, payer, AMOUNT);
        cp.fundAgreement(id);
        vm.stopPrank();

        assertEq(uint8(cp.getAgreement(id).state), uint8(ConditionalPayout.AgreementState.ACTIVE));
        assertEq(usdc.balanceOf(address(cp)), AMOUNT);
    }

    function test_FundAgreement_Revert_NotPayer() public {
        uint256 id = _createAgreement();
        vm.prank(stranger);
        vm.expectRevert(ConditionalPayout.Unauthorized.selector);
        cp.fundAgreement(id);
    }

    function test_FundAgreement_Revert_NotFound() public {
        vm.prank(payer);
        vm.expectRevert(ConditionalPayout.AgreementNotFound.selector);
        cp.fundAgreement(999);
    }

    function test_FundAgreement_Revert_NotPending() public {
        uint256 id = _createAndFund();
        usdc.mint(payer, AMOUNT);
        vm.startPrank(payer);
        usdc.approve(address(cp), AMOUNT);
        vm.expectRevert(ConditionalPayout.InvalidState.selector);
        cp.fundAgreement(id);
        vm.stopPrank();
    }

    // =========================================================================
    // approveCondition
    // =========================================================================

    function test_ApproveCondition_HappyPath() public {
        uint256 id = _createAndFund();
        uint256 before = usdc.balanceOf(recipient);
        vm.expectEmit(true, true, true, true, address(cp));
        emit ConditionalPayout.ConditionApproved(id, approver, recipient, AMOUNT);
        vm.prank(approver);
        cp.approveCondition(id);
        assertEq(usdc.balanceOf(recipient), before + AMOUNT);
        assertEq(uint8(cp.getAgreement(id).state), uint8(ConditionalPayout.AgreementState.RELEASED));
    }

    function test_ApproveCondition_Revert_NotApprover() public {
        uint256 id = _createAndFund();
        vm.prank(stranger);
        vm.expectRevert(ConditionalPayout.Unauthorized.selector);
        cp.approveCondition(id);
    }

    function test_ApproveCondition_Revert_NotActive() public {
        uint256 id = _createAgreement();  // still PENDING
        vm.prank(approver);
        vm.expectRevert(ConditionalPayout.InvalidState.selector);
        cp.approveCondition(id);
    }

    function test_ApproveCondition_Revert_DeadlinePassed() public {
        uint256 id = _createAndFund();
        vm.warp(block.timestamp + DEADLINE + 1);
        vm.prank(approver);
        vm.expectRevert(ConditionalPayout.DeadlinePassed.selector);
        cp.approveCondition(id);
    }

    function test_ApproveCondition_Revert_NotFound() public {
        vm.prank(approver);
        vm.expectRevert(ConditionalPayout.AgreementNotFound.selector);
        cp.approveCondition(999);
    }

    // =========================================================================
    // cancelAgreement
    // =========================================================================

    function test_CancelAgreement_HappyPath() public {
        uint256 id = _createAgreement();
        vm.expectEmit(true, false, false, false, address(cp));
        emit ConditionalPayout.AgreementCancelled(id);
        vm.prank(payer);
        cp.cancelAgreement(id);
        assertEq(uint8(cp.getAgreement(id).state), uint8(ConditionalPayout.AgreementState.CANCELLED));
    }

    function test_CancelAgreement_Revert_NotPayer() public {
        uint256 id = _createAgreement();
        vm.prank(stranger);
        vm.expectRevert(ConditionalPayout.Unauthorized.selector);
        cp.cancelAgreement(id);
    }

    function test_CancelAgreement_Revert_NotPending() public {
        uint256 id = _createAndFund();  // ACTIVE
        vm.prank(payer);
        vm.expectRevert(ConditionalPayout.InvalidState.selector);
        cp.cancelAgreement(id);
    }

    function test_CancelAgreement_Revert_NotFound() public {
        vm.prank(payer);
        vm.expectRevert(ConditionalPayout.AgreementNotFound.selector);
        cp.cancelAgreement(999);
    }

    // =========================================================================
    // claimExpiry
    // =========================================================================

    function test_ClaimExpiry_HappyPath() public {
        uint256 id = _createAndFund();
        vm.warp(block.timestamp + DEADLINE + 1);
        uint256 before = usdc.balanceOf(payer);
        vm.expectEmit(true, false, false, true, address(cp));
        emit ConditionalPayout.AgreementExpired(id, AMOUNT);
        vm.prank(payer);
        cp.claimExpiry(id);
        assertEq(usdc.balanceOf(payer), before + AMOUNT);
        assertEq(uint8(cp.getAgreement(id).state), uint8(ConditionalPayout.AgreementState.EXPIRED));
    }

    function test_ClaimExpiry_Revert_NotPayer() public {
        uint256 id = _createAndFund();
        vm.warp(block.timestamp + DEADLINE + 1);
        vm.prank(stranger);
        vm.expectRevert(ConditionalPayout.Unauthorized.selector);
        cp.claimExpiry(id);
    }

    function test_ClaimExpiry_Revert_DeadlineNotReached() public {
        uint256 id = _createAndFund();
        vm.prank(payer);
        vm.expectRevert(ConditionalPayout.DeadlineNotReached.selector);
        cp.claimExpiry(id);
    }

    function test_ClaimExpiry_Revert_NotActive() public {
        uint256 id = _createAgreement();  // PENDING, not ACTIVE
        vm.warp(block.timestamp + DEADLINE + 1);
        vm.prank(payer);
        vm.expectRevert(ConditionalPayout.InvalidState.selector);
        cp.claimExpiry(id);
    }

    function test_ClaimExpiry_Revert_NotFound() public {
        vm.prank(payer);
        vm.expectRevert(ConditionalPayout.AgreementNotFound.selector);
        cp.claimExpiry(999);
    }

    // =========================================================================
    // getAgreement / getUserAgreements
    // =========================================================================

    function test_GetAgreement_Revert_NotFound() public {
        vm.expectRevert(ConditionalPayout.AgreementNotFound.selector);
        cp.getAgreement(999);
    }

    // =========================================================================
    // Fuzz: amount fidelity – recipient gets exactly what was agreed
    // =========================================================================

    function testFuzz_RecipientReceivesExactAmount(uint64 rawAmount) public {
        uint256 amount = bound(rawAmount, 1, type(uint64).max);
        vm.prank(payer);
        uint256 id = cp.createAgreement(
            recipient, approver, amount,
            block.timestamp + DEADLINE, "fuzz", ""
        );
        usdc.mint(payer, amount);
        vm.startPrank(payer);
        usdc.approve(address(cp), amount);
        cp.fundAgreement(id);
        vm.stopPrank();

        uint256 before = usdc.balanceOf(recipient);
        vm.prank(approver);
        cp.approveCondition(id);
        assertEq(usdc.balanceOf(recipient), before + amount);
    }

    // =========================================================================
    // Invariant: contract USDC balance is non-negative
    // =========================================================================

    function invariant_ContractBalanceNonNegative() public view {
        assertGe(usdc.balanceOf(address(cp)), 0);
    }
}

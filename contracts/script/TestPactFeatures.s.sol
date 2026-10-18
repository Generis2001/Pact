// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {EscrowManager} from "../EscrowManager.sol";
import {ConditionalPayout} from "../ConditionalPayout.sol";
import {BatchPayout} from "../BatchPayout.sol";
import {ScheduledPayout} from "../ScheduledPayout.sol";
import {VestingVault} from "../VestingVault.sol";

contract TestPactFeatures is Script {
    address constant USDC = 0x3600000000000000000000000000000000000000;
    address constant ESCROW_MANAGER = 0x3eF17D9Cd787030Eb68Eb6b2FC6D7F298B9B136F;
    address constant CONDITIONAL_PAYOUT = 0x196B618c6a31A5100b5F9774089E3f6913B9aa55;
    address constant BATCH_PAYOUT = 0xab3f589c7ca55aA6272B1b159ed12d0E7623F798;
    address constant SCHEDULED_PAYOUT = 0x5B4A641Fd1C2E67205d9d4947bcBD63EEDddD5Ab;
    address constant VESTING_VAULT = 0x620eBbf0F0d7acE2202Db95fd6ee0BB42F9510A6;

    address constant TEST_RECIPIENT_1 = 0x1111111111111111111111111111111111111111;
    address constant TEST_RECIPIENT_2 = 0x2222222222222222222222222222222222222222;

    function run() external {
        // Arc Mainnet has a native blocklist precompile at 0x1800000000000000000000000000000000000001
        // Mock it so Foundry's local EVM simulation does not fail with OpcodeNotFound
        vm.mockCall(
            address(0x1800000000000000000000000000000000000001),
            abi.encodeWithSelector(bytes4(0x8e204c43)),
            abi.encode(false)
        );
        vm.mockCall(
            address(0x1800000000000000000000000000000000000001),
            new bytes(0),
            abi.encode(false)
        );
        vm.mockCall(
            address(0x1800000000000000000000000000000000000000),
            new bytes(0),
            abi.encode(true)
        );

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Testing Pact features on Arc Mainnet...");
        console2.log("Tester/Deployer address:", deployer);

        uint256 usdcBalance = IERC20(USDC).balanceOf(deployer);
        console2.log("Current USDC Balance (base units):", usdcBalance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Approvals
        console2.log("Approving contracts to spend USDC...");
        IERC20(USDC).approve(ESCROW_MANAGER, type(uint256).max);
        IERC20(USDC).approve(CONDITIONAL_PAYOUT, type(uint256).max);
        IERC20(USDC).approve(BATCH_PAYOUT, type(uint256).max);
        IERC20(USDC).approve(SCHEDULED_PAYOUT, type(uint256).max);
        IERC20(USDC).approve(VESTING_VAULT, type(uint256).max);

        // 2. Test EscrowManager: 0.01 USDC (10,000 base units)
        console2.log("--- Feature 1: EscrowManager (0.01 USDC) ---");
        EscrowManager.MilestoneInput[] memory milestones = new EscrowManager.MilestoneInput[](1);
        milestones[0] = EscrowManager.MilestoneInput({
            amount: 10_000, // 0.01 USDC
            deadline: block.timestamp + 14 days,
            description: "Milestone 1: Prototype Delivery"
        });
        uint256 escrowId = EscrowManager(ESCROW_MANAGER).createEscrow(
            TEST_RECIPIENT_1,
            TEST_RECIPIENT_2,
            block.timestamp + 30 days,
            milestones
        );
        console2.log("Escrow created with ID:", escrowId);
        EscrowManager(ESCROW_MANAGER).fundEscrow(escrowId);
        console2.log("Escrow funded with 0.01 USDC successfully!");

        // 3. Test ConditionalPayout: 0.005 USDC (5,000 base units)
        console2.log("--- Feature 2: ConditionalPayout (0.005 USDC) ---");
        uint256 agreementId = ConditionalPayout(CONDITIONAL_PAYOUT).createAgreement(
            TEST_RECIPIENT_1,
            TEST_RECIPIENT_2,
            5_000, // 0.005 USDC
            block.timestamp + 14 days,
            "Oracle task verification",
            "ipfs://QmPactConditionalTest"
        );
        console2.log("Conditional agreement created with ID:", agreementId);
        ConditionalPayout(CONDITIONAL_PAYOUT).fundAgreement(agreementId);
        console2.log("Conditional agreement funded with 0.005 USDC successfully!");

        // 4. Test BatchPayout: 0.005 USDC total (0.002 + 0.003 USDC)
        console2.log("--- Feature 3: BatchPayout (0.002 + 0.003 = 0.005 USDC) ---");
        BatchPayout.BatchRecipient[] memory recipients = new BatchPayout.BatchRecipient[](2);
        recipients[0] = BatchPayout.BatchRecipient({
            recipient: TEST_RECIPIENT_1,
            amount: 2_000 // 0.002 USDC
        });
        recipients[1] = BatchPayout.BatchRecipient({
            recipient: TEST_RECIPIENT_2,
            amount: 3_000 // 0.003 USDC
        });
        bytes32 paymentSetId = keccak256(abi.encodePacked("pact-batch-test-", block.timestamp));
        BatchPayout(BATCH_PAYOUT).executeBatch(paymentSetId, recipients);
        console2.log("Batch payout of 0.005 USDC across 2 recipients executed successfully!");

        // 5. Test ScheduledPayout: 0.005 USDC (5,000 base units)
        console2.log("--- Feature 4: ScheduledPayout (0.005 USDC) ---");
        uint256 scheduleId = ScheduledPayout(SCHEDULED_PAYOUT).createSchedule(
            TEST_RECIPIENT_1,
            5_000, // 0.005 USDC per execution
            block.timestamp + 1 hours,
            block.timestamp + 30 days,
            1 days, // interval >= 1 day
            5,
            "Daily retainer payout"
        );
        console2.log("Schedule created with ID:", scheduleId);
        ScheduledPayout(SCHEDULED_PAYOUT).fundSchedule(scheduleId, 5_000);
        console2.log("Schedule funded with 0.005 USDC successfully!");

        // 6. Test VestingVault: 0.01 USDC (10,000 base units)
        console2.log("--- Feature 5: VestingVault (0.01 USDC) ---");
        uint256 vestingId = VestingVault(VESTING_VAULT).createSchedule(
            TEST_RECIPIENT_1,
            10_000, // 0.01 USDC
            block.timestamp,
            block.timestamp + 180 days,
            0, // no cliff
            VestingVault.VestingType.LINEAR,
            0, // linear continuous
            true // revocable
        );
        console2.log("Vesting schedule created and funded with ID:", vestingId);

        vm.stopBroadcast();

        uint256 remainingUsdc = IERC20(USDC).balanceOf(deployer);
        console2.log("Remaining USDC Balance (base units):", remainingUsdc);
        console2.log("Total USDC tested: 35000 base units (0.035 USDC)");
    }
}

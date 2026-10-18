// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {EscrowManager} from "../EscrowManager.sol";
import {ConditionalPayout} from "../ConditionalPayout.sol";
import {BatchPayout} from "../BatchPayout.sol";
import {ScheduledPayout} from "../ScheduledPayout.sol";
import {VestingVault} from "../VestingVault.sol";

contract DeployPact is Script {
    function run()
        external
        returns (
            address escrowManagerAddr,
            address conditionalPayoutAddr,
            address batchPayoutAddr,
            address scheduledPayoutAddr,
            address vestingVaultAddr
        )
    {
        address usdc = vm.envOr("USDC_ADDRESS", address(0x3600000000000000000000000000000000000000));
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        console2.log("Deploying Pact contracts to Arc...");
        console2.log("USDC address:", usdc);
        console2.log("Deployer:", vm.addr(deployerPrivateKey));

        vm.startBroadcast(deployerPrivateKey);

        EscrowManager escrowManager = new EscrowManager(usdc);
        escrowManagerAddr = address(escrowManager);
        console2.log("EscrowManager deployed at:", escrowManagerAddr);

        ConditionalPayout conditionalPayout = new ConditionalPayout(usdc);
        conditionalPayoutAddr = address(conditionalPayout);
        console2.log("ConditionalPayout deployed at:", conditionalPayoutAddr);

        BatchPayout batchPayout = new BatchPayout(usdc);
        batchPayoutAddr = address(batchPayout);
        console2.log("BatchPayout deployed at:", batchPayoutAddr);

        ScheduledPayout scheduledPayout = new ScheduledPayout(usdc);
        scheduledPayoutAddr = address(scheduledPayout);
        console2.log("ScheduledPayout deployed at:", scheduledPayoutAddr);

        VestingVault vestingVault = new VestingVault(usdc);
        vestingVaultAddr = address(vestingVault);
        console2.log("VestingVault deployed at:", vestingVaultAddr);

        vm.stopBroadcast();
    }
}

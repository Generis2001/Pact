// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {EscrowManager} from "../EscrowManager.sol";
import {ConditionalPayout} from "../ConditionalPayout.sol";
import {ScheduledPayout} from "../ScheduledPayout.sol";

/// @notice Replacement deployments only. Existing records remain at their original addresses.
/// @dev Use a local Foundry keystore via --account; do not put a private key in source or shell history.
contract DeployFixes is Script {
    function run() external {
        require(block.chainid == 5042 || block.chainid == 5042002 || block.chainid == 31337, "Unsupported chain");
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address usdc = address(0x3600000000000000000000000000000000000000);
        vm.startBroadcast(deployer);
        console2.log("EscrowManager:", address(new EscrowManager(usdc)));
        console2.log("ConditionalPayout:", address(new ConditionalPayout(usdc)));
        console2.log("ScheduledPayout:", address(new ScheduledPayout(usdc)));
        vm.stopBroadcast();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract EscrowManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum EscrowState {
        CREATED,
        FUNDED,
        RELEASED,
        REFUNDED,
        DISPUTED,
        RESOLVED
    }

    enum MilestoneState {
        NEW,
        RELEASED,
        REFUNDED,
        DISPUTED,
        RESOLVED
    }

    struct Milestone {
        uint256 amount;
        uint256 deadline;
        string description;
        MilestoneState state;
    }

    struct MilestoneInput {
        uint256 amount;
        uint256 deadline;
        string description;
    }

    struct Escrow {
        address depositor;
        address beneficiary;
        address arbiter;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 deadline;
        EscrowState state;
        bool depositorApproved;
        bool arbiterApproved;
        Milestone[] milestones;
    }

    error ZeroAddress();
    error InvalidAmount();
    error InvalidDeadline();
    error EscrowNotFound();
    error Unauthorized();
    error InvalidState();
    error DeadlineNotReached();
    error DeadlinePassed();
    error InvalidMilestoneCount();
    error InvalidMilestoneIndex();
    error InvalidMilestoneState();

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed depositor,
        address indexed beneficiary,
        address arbiter,
        uint256 amount,
        uint256 deadline,
        string description
    );
    event EscrowFunded(uint256 indexed escrowId, address indexed depositor, uint256 amount);
    event Released(uint256 indexed escrowId, address indexed beneficiary, uint256 amount);
    event Disputed(uint256 indexed escrowId, address indexed caller);
    event Resolved(uint256 indexed escrowId, bool releasedToBeneficiary, uint256 amount);
    event Refunded(uint256 indexed escrowId, uint256 amount);
    event MilestoneReleased(uint256 indexed escrowId, uint256 milestoneIndex, uint256 amount);
    event MilestoneDisputed(uint256 indexed escrowId, uint256 milestoneIndex);
    event MilestoneResolved(uint256 indexed escrowId, uint256 milestoneIndex, bool releasedToBeneficiary, uint256 amount);

    IERC20 private immutable _usdc;
    uint256 private _nextEscrowId = 1;

    mapping(uint256 => Escrow) private _escrows;
    mapping(address => uint256[]) private _userEscrows;
    mapping(uint256 => mapping(uint256 => bool)) private _milestoneDepositorApproved;
    mapping(uint256 => mapping(uint256 => bool)) private _milestoneArbiterApproved;

    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        _usdc = IERC20(usdc_);
    }

    modifier onlyDepositor(uint256 escrowId) {
        if (_escrows[escrowId].depositor == address(0)) revert EscrowNotFound();
        if (msg.sender != _escrows[escrowId].depositor) revert Unauthorized();
        _;
    }

    modifier onlyArbiter(uint256 escrowId) {
        if (_escrows[escrowId].depositor == address(0)) revert EscrowNotFound();
        if (msg.sender != _escrows[escrowId].arbiter) revert Unauthorized();
        _;
    }

    /// @notice Creates a new escrow agreement.
    /// @param beneficiary Recipient of released funds.
    /// @param arbiter Address that can co-approve release and resolve disputes.
    /// @param deadline Unix timestamp after which depositor may claim refund.
    /// @param milestones Milestone definitions for this escrow.
    /// @return escrowId Newly created escrow identifier.
    function createEscrow(
        address beneficiary,
        address arbiter,
        uint256 deadline,
        MilestoneInput[] calldata milestones
    ) external returns (uint256 escrowId) {
        if (beneficiary == address(0) || arbiter == address(0)) revert ZeroAddress();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (milestones.length == 0 || milestones.length > 20) revert InvalidMilestoneCount();

        uint256 totalAmount;
        for (uint256 i = 0; i < milestones.length; ++i) {
            MilestoneInput calldata milestoneInput = milestones[i];
            if (milestoneInput.amount == 0) revert InvalidAmount();
            if (milestoneInput.deadline != 0 && milestoneInput.deadline <= block.timestamp) revert InvalidDeadline();
            totalAmount += milestoneInput.amount;
        }

        escrowId = _nextEscrowId;
        _nextEscrowId = escrowId + 1;

        Escrow storage esc = _escrows[escrowId];
        esc.depositor = msg.sender;
        esc.beneficiary = beneficiary;
        esc.arbiter = arbiter;
        esc.totalAmount = totalAmount;
        esc.deadline = deadline;
        esc.state = EscrowState.CREATED;

        for (uint256 i = 0; i < milestones.length; ++i) {
            MilestoneInput calldata milestoneInput = milestones[i];
            esc.milestones.push(
                Milestone({
                    amount: milestoneInput.amount,
                    deadline: milestoneInput.deadline,
                    description: milestoneInput.description,
                    state: MilestoneState.NEW
                })
            );
        }

        _userEscrows[msg.sender].push(escrowId);
        if (beneficiary != msg.sender) _userEscrows[beneficiary].push(escrowId);
        if (arbiter != msg.sender && arbiter != beneficiary) _userEscrows[arbiter].push(escrowId);

        string memory eventDescription = milestones.length == 1 ? milestones[0].description : "";
        emit EscrowCreated(escrowId, msg.sender, beneficiary, arbiter, totalAmount, deadline, eventDescription);
    }

    /// @notice Funds an escrow by pulling USDC from the depositor.
    /// @param escrowId Escrow identifier.
    function fundEscrow(uint256 escrowId) external nonReentrant onlyDepositor(escrowId) {
        Escrow storage esc = _escrows[escrowId];
        if (esc.state != EscrowState.CREATED) revert InvalidState();
        if (block.timestamp > esc.deadline) revert DeadlinePassed();

        esc.state = EscrowState.FUNDED;
        _usdc.safeTransferFrom(msg.sender, address(this), esc.totalAmount);

        emit EscrowFunded(escrowId, msg.sender, esc.totalAmount);
    }

    /// @notice Approves escrow release; release executes once both depositor and arbiter approve.
    /// @dev Backward-compatible batch approval across all milestones.
    /// @param escrowId Escrow identifier.
    function approveRelease(uint256 escrowId) external nonReentrant {
        Escrow storage esc = _escrows[escrowId];
        if (esc.depositor == address(0)) revert EscrowNotFound();
        if (esc.state != EscrowState.FUNDED) revert InvalidState();

        if (msg.sender == esc.depositor) {
            esc.depositorApproved = true;
        } else if (msg.sender == esc.arbiter) {
            esc.arbiterApproved = true;
        } else {
            revert Unauthorized();
        }

        if (esc.depositorApproved && esc.arbiterApproved) {
            uint256 releasedAmount;
            for (uint256 i = 0; i < esc.milestones.length; ++i) {
                Milestone storage milestone = esc.milestones[i];
                if (milestone.state != MilestoneState.NEW) continue;

                milestone.state = MilestoneState.RELEASED;
                releasedAmount += milestone.amount;
                esc.releasedAmount += milestone.amount;
                _usdc.safeTransfer(esc.beneficiary, milestone.amount);
                emit MilestoneReleased(escrowId, i, milestone.amount);
            }

            if (_areAllMilestonesSettled(escrowId)) {
                esc.state = EscrowState.RELEASED;
                emit Released(escrowId, esc.beneficiary, releasedAmount);
            }
        }
    }

    /// @notice Approves and potentially releases a specific milestone.
    /// @param escrowId Escrow identifier.
    /// @param milestoneIndex Milestone index in the escrow milestone array.
    function approveMilestone(uint256 escrowId, uint256 milestoneIndex) external nonReentrant {
        Escrow storage esc = _escrows[escrowId];
        if (esc.depositor == address(0)) revert EscrowNotFound();
        if (esc.state != EscrowState.FUNDED) revert InvalidState();
        if (milestoneIndex >= esc.milestones.length) revert InvalidMilestoneIndex();

        Milestone storage milestone = esc.milestones[milestoneIndex];
        if (milestone.state != MilestoneState.NEW) revert InvalidMilestoneState();

        uint256 milestoneDeadline = milestone.deadline == 0 ? esc.deadline : milestone.deadline;
        if (block.timestamp > milestoneDeadline) revert DeadlinePassed();

        if (msg.sender == esc.depositor) {
            _milestoneDepositorApproved[escrowId][milestoneIndex] = true;
        } else if (msg.sender == esc.arbiter) {
            _milestoneArbiterApproved[escrowId][milestoneIndex] = true;
        } else {
            revert Unauthorized();
        }

        if (_milestoneDepositorApproved[escrowId][milestoneIndex] && _milestoneArbiterApproved[escrowId][milestoneIndex]) {
            milestone.state = MilestoneState.RELEASED;
            esc.releasedAmount += milestone.amount;
            _usdc.safeTransfer(esc.beneficiary, milestone.amount);
            emit MilestoneReleased(escrowId, milestoneIndex, milestone.amount);

            if (_areAllMilestonesSettled(escrowId)) {
                esc.state = EscrowState.RELEASED;
                emit Released(escrowId, esc.beneficiary, esc.totalAmount);
            }
        }
    }

    /// @notice Initiates a dispute while escrow is funded.
    /// @param escrowId Escrow identifier.
    function initiateDispute(uint256 escrowId) external {
        Escrow storage esc = _escrows[escrowId];
        if (esc.depositor == address(0)) revert EscrowNotFound();
        if (esc.state != EscrowState.FUNDED) revert InvalidState();
        if (msg.sender != esc.beneficiary && msg.sender != esc.depositor) revert Unauthorized();

        esc.state = EscrowState.DISPUTED;
        emit Disputed(escrowId, msg.sender);
    }

    /// @notice Disputes a specific milestone while escrow is funded.
    /// @param escrowId Escrow identifier.
    /// @param milestoneIndex Milestone index in the escrow milestone array.
    function disputeMilestone(uint256 escrowId, uint256 milestoneIndex) external {
        Escrow storage esc = _escrows[escrowId];
        if (esc.depositor == address(0)) revert EscrowNotFound();
        if (esc.state != EscrowState.FUNDED) revert InvalidState();
        if (msg.sender != esc.beneficiary && msg.sender != esc.depositor) revert Unauthorized();
        if (milestoneIndex >= esc.milestones.length) revert InvalidMilestoneIndex();

        Milestone storage milestone = esc.milestones[milestoneIndex];
        if (milestone.state != MilestoneState.NEW) revert InvalidMilestoneState();

        milestone.state = MilestoneState.DISPUTED;
        emit MilestoneDisputed(escrowId, milestoneIndex);
    }

    /// @notice Resolves a disputed milestone and pays beneficiary or refunds depositor.
    /// @param escrowId Escrow identifier.
    /// @param milestoneIndex Milestone index in the escrow milestone array.
    /// @param releaseToBeneficiary True to release to beneficiary, false to refund depositor.
    function resolveMilestone(
        uint256 escrowId,
        uint256 milestoneIndex,
        bool releaseToBeneficiary
    ) external nonReentrant onlyArbiter(escrowId) {
        Escrow storage esc = _escrows[escrowId];
        if (esc.state != EscrowState.FUNDED) revert InvalidState();
        if (milestoneIndex >= esc.milestones.length) revert InvalidMilestoneIndex();

        Milestone storage milestone = esc.milestones[milestoneIndex];
        if (milestone.state != MilestoneState.DISPUTED) revert InvalidMilestoneState();

        milestone.state = MilestoneState.RESOLVED;

        if (releaseToBeneficiary) {
            _usdc.safeTransfer(esc.beneficiary, milestone.amount);
        } else {
            _usdc.safeTransfer(esc.depositor, milestone.amount);
        }

        emit MilestoneResolved(escrowId, milestoneIndex, releaseToBeneficiary, milestone.amount);

        if (_areAllMilestonesSettled(escrowId)) {
            esc.state = EscrowState.RESOLVED;
        }
    }

    /// @notice Resolves a disputed escrow and pays beneficiary or refunds depositor.
    /// @param escrowId Escrow identifier.
    /// @param releaseToBeneficiary True to release to beneficiary, false to refund depositor.
    function resolveDispute(uint256 escrowId, bool releaseToBeneficiary) external nonReentrant onlyArbiter(escrowId) {
        Escrow storage esc = _escrows[escrowId];
        if (esc.state != EscrowState.DISPUTED) revert InvalidState();

        uint256 remaining = esc.totalAmount - esc.releasedAmount;
        if (remaining == 0) {
            esc.state = EscrowState.RESOLVED;
            emit Resolved(escrowId, releaseToBeneficiary, 0);
            return;
        }

        esc.state = EscrowState.RESOLVED;

        if (releaseToBeneficiary) {
            _usdc.safeTransfer(esc.beneficiary, remaining);
        } else {
            _usdc.safeTransfer(esc.depositor, remaining);
        }

        emit Resolved(escrowId, releaseToBeneficiary, remaining);
    }

    /// @notice Claims refund after deadline while escrow is unfunded or funded.
    /// @param escrowId Escrow identifier.
    function claimRefund(uint256 escrowId) external nonReentrant onlyDepositor(escrowId) {
        Escrow storage esc = _escrows[escrowId];
        if (esc.state != EscrowState.CREATED && esc.state != EscrowState.FUNDED) revert InvalidState();
        if (block.timestamp <= esc.deadline) revert DeadlineNotReached();

        EscrowState previousState = esc.state;
        esc.state = EscrowState.REFUNDED;

        if (previousState == EscrowState.FUNDED) {
            uint256 remaining = esc.totalAmount - esc.releasedAmount;
            if (remaining > 0) {
                _usdc.safeTransfer(esc.depositor, remaining);
            }
            emit Refunded(escrowId, remaining);
            return;
        }

        emit Refunded(escrowId, 0);
    }

    /// @notice Returns escrow details.
    /// @param escrowId Escrow identifier.
    /// @return Escrow struct.
    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        Escrow memory esc = _escrows[escrowId];
        if (esc.depositor == address(0)) revert EscrowNotFound();
        return esc;
    }

    /// @notice Returns milestones for an escrow.
    /// @param escrowId Escrow identifier.
    /// @return Array of milestones.
    function getMilestones(uint256 escrowId) external view returns (Milestone[] memory) {
        Escrow storage esc = _escrows[escrowId];
        if (esc.depositor == address(0)) revert EscrowNotFound();
        return esc.milestones;
    }

    /// @notice Returns escrow IDs associated with a user.
    /// @param user User address.
    /// @return Array of escrow IDs.
    function getUserEscrows(address user) external view returns (uint256[] memory) {
        return _userEscrows[user];
    }

    function _areAllMilestonesSettled(uint256 escrowId) private view returns (bool) {
        Milestone[] storage milestones = _escrows[escrowId].milestones;
        for (uint256 i = 0; i < milestones.length; ++i) {
            MilestoneState state = milestones[i].state;
            if (state == MilestoneState.NEW || state == MilestoneState.DISPUTED) return false;
        }
        return true;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VestingVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum VestingType {
        LINEAR,
        CLIFF,
        PERIODIC
    }

    enum VestingState {
        ACTIVE,
        REVOKED,
        COMPLETED
    }

    struct VestingSchedule {
        address beneficiary;
        uint256 totalAmount;
        uint256 startTime;
        uint256 endTime;
        uint256 cliffTime;
        VestingType vestingType;
        uint256 intervalSeconds;
        uint256 claimedAmount;
        uint256 revokedAt;
        bool revocable;
        address grantor;
        VestingState state;
    }

    error ZeroAddress();
    error InvalidAmount();
    error InvalidTimeRange();
    error InvalidCliff();
    error InvalidInterval();
    error ScheduleNotFound();
    error Unauthorized();
    error NotRevocable();
    error AlreadyRevoked();
    error NothingClaimable();

    event ScheduleCreated(
        uint256 indexed vestingId,
        address indexed grantor,
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 endTime,
        uint256 cliffTime,
        VestingType vestingType,
        uint256 intervalSeconds,
        bool revocable
    );
    event VestingClaimed(uint256 indexed vestingId, address indexed beneficiary, uint256 amountClaimed, uint256 totalClaimed);
    event ScheduleRevoked(uint256 indexed vestingId, address indexed grantor, uint256 unvestedRefunded, uint256 revokedAt);

    IERC20 private immutable _usdc;
    uint256 private _nextVestingId = 1;

    mapping(uint256 => VestingSchedule) private _schedules;
    mapping(address => uint256[]) private _beneficiarySchedules;
    mapping(address => uint256[]) private _grantorSchedules;

    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        _usdc = IERC20(usdc_);
    }

    /// @notice Creates a vesting schedule and deposits full amount.
    /// @param beneficiary Beneficiary of vested tokens.
    /// @param totalAmount Total vested amount in USDC base units.
    /// @param startTime Vesting start timestamp.
    /// @param endTime Vesting end timestamp.
    /// @param cliffTime Cliff timestamp for cliff-based vesting.
    /// @param vestingType Vesting type.
    /// @param intervalSeconds Interval for periodic vesting.
    /// @param revocable True if grantor can revoke unvested amount.
    /// @return vestingId Newly created vesting identifier.
    function createSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 endTime,
        uint256 cliffTime,
        VestingType vestingType,
        uint256 intervalSeconds,
        bool revocable
    ) external nonReentrant returns (uint256 vestingId) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (totalAmount == 0) revert InvalidAmount();
        if (endTime <= startTime) revert InvalidTimeRange();

        if (vestingType == VestingType.CLIFF) {
            if (cliffTime < startTime || cliffTime > endTime) revert InvalidCliff();
        }

        if (vestingType == VestingType.PERIODIC) {
            if (intervalSeconds == 0) revert InvalidInterval();
        }

        vestingId = _nextVestingId;
        _nextVestingId = vestingId + 1;

        VestingSchedule storage sch = _schedules[vestingId];
        sch.beneficiary = beneficiary;
        sch.totalAmount = totalAmount;
        sch.startTime = startTime;
        sch.endTime = endTime;
        sch.cliffTime = cliffTime;
        sch.vestingType = vestingType;
        sch.intervalSeconds = intervalSeconds;
        sch.revocable = revocable;
        sch.grantor = msg.sender;
        sch.state = VestingState.ACTIVE;

        _beneficiarySchedules[beneficiary].push(vestingId);
        _grantorSchedules[msg.sender].push(vestingId);

        _usdc.safeTransferFrom(msg.sender, address(this), totalAmount);

        emit ScheduleCreated(
            vestingId,
            msg.sender,
            beneficiary,
            totalAmount,
            startTime,
            endTime,
            cliffTime,
            vestingType,
            intervalSeconds,
            revocable
        );
    }

    /// @notice Claims currently vested but unclaimed amount.
    /// @param vestingId Vesting identifier.
    function claimVested(uint256 vestingId) external nonReentrant {
        VestingSchedule storage sch = _schedules[vestingId];
        if (sch.grantor == address(0)) revert ScheduleNotFound();
        if (msg.sender != sch.beneficiary) revert Unauthorized();

        uint256 vested = _vestedAt(vestingId, block.timestamp);
        uint256 claimable = vested - sch.claimedAmount;
        if (claimable == 0) revert NothingClaimable();

        sch.claimedAmount += claimable;
        if (sch.claimedAmount == sch.totalAmount) {
            sch.state = sch.revokedAt > 0 ? VestingState.REVOKED : VestingState.COMPLETED;
        }

        _usdc.safeTransfer(sch.beneficiary, claimable);

        emit VestingClaimed(vestingId, sch.beneficiary, claimable, sch.claimedAmount);
    }

    /// @notice Revokes a revocable schedule and refunds unvested tokens to grantor.
    /// @param vestingId Vesting identifier.
    function revokeSchedule(uint256 vestingId) external nonReentrant {
        VestingSchedule storage sch = _schedules[vestingId];
        if (sch.grantor == address(0)) revert ScheduleNotFound();
        if (msg.sender != sch.grantor) revert Unauthorized();
        if (!sch.revocable) revert NotRevocable();
        if (sch.revokedAt != 0) revert AlreadyRevoked();

        uint256 vestedAtRevoke = _vestedValue(sch, block.timestamp);
        uint256 unvested = sch.totalAmount - vestedAtRevoke;

        sch.revokedAt = block.timestamp;
        sch.state = VestingState.REVOKED;

        if (unvested > 0) {
            _usdc.safeTransfer(sch.grantor, unvested);
        }

        emit ScheduleRevoked(vestingId, sch.grantor, unvested, sch.revokedAt);
    }

    /// @notice Returns currently claimable vested amount.
    /// @param vestingId Vesting identifier.
    /// @return Amount currently claimable by beneficiary.
    function claimableAmount(uint256 vestingId) external view returns (uint256) {
        VestingSchedule memory sch = _schedules[vestingId];
        if (sch.grantor == address(0)) revert ScheduleNotFound();

        uint256 vested = _vestedAt(vestingId, block.timestamp);
        return vested - sch.claimedAmount;
    }

    /// @notice Returns full vesting schedule details.
    /// @param vestingId Vesting identifier.
    /// @return Vesting schedule struct.
    function getSchedule(uint256 vestingId) external view returns (VestingSchedule memory) {
        VestingSchedule memory sch = _schedules[vestingId];
        if (sch.grantor == address(0)) revert ScheduleNotFound();
        return sch;
    }

    /// @notice Returns vesting IDs belonging to a beneficiary.
    /// @param beneficiary Beneficiary address.
    /// @return Array of vesting IDs.
    function getBeneficiarySchedules(address beneficiary) external view returns (uint256[] memory) {
        return _beneficiarySchedules[beneficiary];
    }

    /// @notice Returns vesting IDs created by a grantor.
    /// @param grantor Grantor address.
    /// @return Array of vesting IDs.
    function getGrantorSchedules(address grantor) external view returns (uint256[] memory) {
        return _grantorSchedules[grantor];
    }

    /// @notice Computes vested amount at a timestamp.
    /// @param vestingId Vesting identifier.
    /// @param ts Timestamp to evaluate.
    /// @return vestedAmount Amount vested at timestamp.
    function _vestedAt(uint256 vestingId, uint256 ts) internal view returns (uint256 vestedAmount) {
        VestingSchedule memory sch = _schedules[vestingId];
        if (sch.grantor == address(0)) revert ScheduleNotFound();

        uint256 effectiveTs = ts;
        if (sch.revokedAt != 0 && effectiveTs > sch.revokedAt) {
            effectiveTs = sch.revokedAt;
        }

        vestedAmount = _vestedValue(sch, effectiveTs);
        if (vestedAmount > sch.totalAmount) {
            vestedAmount = sch.totalAmount;
        }
    }

    function _vestedValue(VestingSchedule memory sch, uint256 ts) internal pure returns (uint256) {
        if (ts <= sch.startTime) {
            return 0;
        }
        if (ts >= sch.endTime) {
            return sch.totalAmount;
        }

        if (sch.vestingType == VestingType.LINEAR) {
            uint256 elapsed = ts - sch.startTime;
            uint256 duration = sch.endTime - sch.startTime;
            return (sch.totalAmount * elapsed) / duration;
        }

        if (sch.vestingType == VestingType.CLIFF) {
            if (ts < sch.cliffTime) {
                return 0;
            }

            if (sch.endTime == sch.cliffTime) {
                return sch.totalAmount;
            }

            uint256 elapsedFromCliff = ts - sch.cliffTime;
            uint256 cliffDuration = sch.endTime - sch.cliffTime;
            return (sch.totalAmount * elapsedFromCliff) / cliffDuration;
        }

        uint256 elapsedPeriodic = ts - sch.startTime;
        uint256 completedIntervals = elapsedPeriodic / sch.intervalSeconds;
        uint256 totalIntervals = (sch.endTime - sch.startTime) / sch.intervalSeconds;

        if (totalIntervals == 0) {
            return 0;
        }

        if (completedIntervals >= totalIntervals) {
            return sch.totalAmount;
        }

        uint256 amountPerInterval = sch.totalAmount / totalIntervals;
        uint256 vested = completedIntervals * amountPerInterval;

        if (vested > sch.totalAmount) {
            return sch.totalAmount;
        }
        return vested;
    }
}

// SPDX-License-Identifier: MIT
/**
 _____
/  __ \
| /  \/ ___  _ ____   _____ _ __ __ _  ___ _ __   ___ ___
| |    / _ \| '_ \ \ / / _ \ '__/ _` |/ _ \ '_ \ / __/ _ \
| \__/\ (_) | | | \ V /  __/ | | (_| |  __/ | | | (_|  __/
\____/\___/|_| |_|\_/ \___|_|  \__, |\___|_| |_|\___\___|
                                 __/ |
                                |___/
 */
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "../interfaces/ICvgControlTower.sol";

contract mock_CvgControlTowerV2 is Ownable2StepUpgradeable {
    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                  GLOBAL PARAMETERS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    uint128 public cvgCycle;
    ICvgOracle public cvgOracle;
    ICvg public cvgToken;
    ICvgRewards public cvgRewards;
    address public cloneFactory;

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                  BONDS GLOBAL PARAMETERS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    IBondCalculator public bondCalculator;
    IBondPositionManager public bondPositionManager;
    IBondDepository public bondDepository;
    mapping(address => bool) public isBond; /// contractAddress => bool

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                  STAKING GLOBAL PARAMETERS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    ISdtStakingPositionManager public sdtStakingPositionManager;
    ISdtStakingPositionService public cvgSdtStaking;
    ISdtBlackHole public sdtBlackHole;
    ISdtBuffer public cvgSdtBuffer;
    IERC20Mintable public cvgSDT;
    IERC20 public sdt;
    address public poolCvgSdt;
    address public sdtFeeCollector;
    address public sdtStakingViewer;
    ISdtStakingPositionService[] public sdAndLpAssetStaking;
    address public sdtRewardDistributor;

    /// @dev Determines if an address is a sdt staking contract and therefore can trigger withdrawals from the SdtBlackHole.
    mapping(address => bool) public isSdtStaking; /// contractAddress => bool

    /**
     * @dev Determines if an address is a staking contract and therefore is able to mint CVG with `mintStaking` function.
     *      Only these addresses can be set up as gauge.
     */
    mapping(address => bool) public isStakingContract; /// contractAddress => bool
    address public sdtUtilities;

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                 LOCKING PARAMETERS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    ILockingPositionManager public lockingPositionManager;
    ILockingPositionService public lockingPositionService;
    ILockingPositionDelegate public lockingPositionDelegate;
    IVotingPowerEscrow public votingPowerEscrow;
    IGaugeController public gaugeController;
    IYsDistributor public ysDistributor;

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                 WALLETS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    address public treasuryPod;
    address public treasuryPdd;
    address public treasuryDao;
    address public treasuryAirdrop;
    address public treasuryTeam;
    address public veSdtMultisig;
    address public treasuryPartners;

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                 VESTING
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    IVestingCvg public vestingCvg;
    address public ibo;

    event NewCycle(uint256 cvgCycleId);

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=

                        NEW V2 STORAGE
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    uint256 public testStorageV2;
    mapping(address => bool) public testMapping;

    function testProxy() external view returns (uint256) {
        return 256;
    }

    function changeTestStorageV2(uint256 _amount) external {
        testStorageV2 = _amount;
    }

    function changeTestMapping(address _addr) external {
        testMapping[_addr] = true;
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                      CLONE FACTORY FUNCTIONS
  =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    function toggleStakingContract(address contractAddress) external onlyOwner {
        isStakingContract[contractAddress] = !isStakingContract[contractAddress];
    }

    /** @notice Insert a new sd/LP-asset staking contract, can only be called by the clone factory.
     * @param _sdtStakingClone address of the new staking contract
     */
    function insertNewSdtStaking(ISdtStakingPositionService _sdtStakingClone) external {
        require(msg.sender == cloneFactory, "CLONE_FACTORY");
        sdAndLpAssetStaking.push(_sdtStakingClone);
        isSdtStaking[address(_sdtStakingClone)] = true;
        isStakingContract[address(_sdtStakingClone)] = true;
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                      INTERNAL FUNCTIONS
  =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /// Pagination pattern in order to don't run out of gaz if an array is to big
    /// Chunk the original array
    /// @param _fullArray - full array address to be splitted
    /// @param _cursorStart    - index of the array to be the first item of the returned array
    /// @param _lengthDesired - max length of the returned array
    function _paginate(
        address[] memory _fullArray,
        uint256 _cursorStart,
        uint256 _lengthDesired
    ) internal pure returns (address[] memory) {
        /// @dev Prevent massive array retrieval
        require(_lengthDesired <= 20, "MAX_SIZE");

        uint256 _totalArrayLength = _fullArray.length;

        if (_cursorStart + _lengthDesired > _totalArrayLength) {
            _lengthDesired = _totalArrayLength - _cursorStart;
        }
        /// @dev Prevent to reach an index that doesn't exist in the array
        address[] memory array = new address[](_lengthDesired);
        for (uint256 i = _cursorStart; i < _cursorStart + _lengthDesired; ) {
            array[i - _cursorStart] = _fullArray[i];
            unchecked {
                ++i;
            }
        }

        return array;
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                          SETTERS
  =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    function setOracle(ICvgOracle newCvgOracle) external onlyOwner {
        cvgOracle = newCvgOracle;
    }

    function setTreasuryPod(address newTreasuryPodMultisig) external onlyOwner {
        treasuryPod = newTreasuryPodMultisig;
    }

    function setTreasuryPdd(address newTreasuryPddMultisig) external onlyOwner {
        treasuryPdd = newTreasuryPddMultisig;
    }

    function setBondCalculator(IBondCalculator newBondCalculator) external onlyOwner {
        bondCalculator = newBondCalculator;
    }

    function setTreasuryDao(address newTreasuryDao) external onlyOwner {
        treasuryDao = newTreasuryDao;
    }

    function setCvgRewards(ICvgRewards newCvgRewards) external onlyOwner {
        cvgRewards = newCvgRewards;
    }

    function setVeCVG(IVotingPowerEscrow newVotingPowerEscrow) external onlyOwner {
        votingPowerEscrow = newVotingPowerEscrow;
    }

    function setGaugeController(IGaugeController newGaugeController) external onlyOwner {
        gaugeController = newGaugeController;
    }

    function setCloneFactory(address newCloneFactory) external onlyOwner {
        cloneFactory = newCloneFactory;
    }

    function setLockingPositionManager(ILockingPositionManager newLockingPositionManager) external onlyOwner {
        lockingPositionManager = newLockingPositionManager;
    }

    function setLockingPositionService(ILockingPositionService newLockingPositionService) external onlyOwner {
        lockingPositionService = newLockingPositionService;
    }

    function setLockingPositionDelegate(ILockingPositionDelegate newLockingPositionDelegate) external onlyOwner {
        lockingPositionDelegate = newLockingPositionDelegate;
    }

    function setYsDistributor(IYsDistributor _ysDistributor) external onlyOwner {
        ysDistributor = _ysDistributor;
    }

    function setCvg(ICvg _cvgToken) external onlyOwner {
        cvgToken = _cvgToken;
    }

    function setBondPositionManager(IBondPositionManager _bondPositionManager) external onlyOwner {
        bondPositionManager = _bondPositionManager;
    }

    function setSdt(IERC20 _sdt) external onlyOwner {
        sdt = _sdt;
    }

    function setCvgSdt(IERC20Mintable _cvgSDT) external onlyOwner {
        cvgSDT = _cvgSDT;
    }

    function setCvgSdtStaking(ISdtStakingPositionService _cvgSdtStaking) external onlyOwner {
        cvgSdtStaking = _cvgSdtStaking;
    }

    function setVeSdtMultisig(address _veSdtMultisig) external onlyOwner {
        veSdtMultisig = _veSdtMultisig;
    }

    function setCvgSdtBuffer(ISdtBuffer _cvgSdtBuffer) external onlyOwner {
        cvgSdtBuffer = _cvgSdtBuffer;
    }

    function setPoolCvgSdt(address _poolCvgSDT) external onlyOwner {
        poolCvgSdt = _poolCvgSDT;
    }

    function setSdtBlackHole(ISdtBlackHole _sdtBlackHole) external onlyOwner {
        sdtBlackHole = _sdtBlackHole;
    }

    function setVestingCvg(IVestingCvg _vestingCvg) external onlyOwner {
        vestingCvg = _vestingCvg;
    }

    function setSdtUtilities(address _sdtUtilities) external onlyOwner {
        sdtUtilities = _sdtUtilities;
    }

    function setIbo(address _ibo) external onlyOwner {
        ibo = _ibo;
    }

    function setSdtRewardDistributor(address _sdtRewardDistributor) external onlyOwner {
        sdtRewardDistributor = _sdtRewardDistributor;
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                      CYCLE MANAGEMENT
  =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /**
     * @notice Update Cvg cycle.
     * @dev Updates ysCvg total supply too, can only be called by CvgRewards.
     */
    function updateCvgCycle() external {
        require(msg.sender == address(cvgRewards), "NOT_CVG_REWARDS");
        uint256 _newCycle = ++cvgCycle;

        emit NewCycle(_newCycle);
    }
}

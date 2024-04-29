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

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "../interfaces/ICvgControlTower.sol";
import "../interfaces/IWETH.sol";

/// @title Cvg-Finance - BondDepository
/// @notice Bond depository contract
contract BondDepositoryV2 is Ownable2StepUpgradeable {
    using SafeERC20 for IERC20Metadata;
    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                            PACKAGING
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */
    uint256 private constant MAX_UINT = type(uint256).max;

    /// @dev acts in such a way that users don't use the Bond & Lock feature just to take advantage of the discounted price with a short locking period
    uint256 private constant MINIMUM_LOCK_DURATION = 36;

    uint256 private constant MAXIMUM_PERCENTAGE_VESTING = 10_000;

    uint256 private constant MAXIMUM_ROI = 1_000_000;

    uint256 private constant MAXIMUM_PERCENTAGE_PER_DEPOSIT = 1_000;

    /// @dev convergence ecosystem address
    ICvgControlTower public cvgControlTower;

    /// @dev convergence ecosystem address
    IBondPositionManager public bondPositionManager;

    /// @dev convergence ecosystem address
    ILockingPositionService public lockingPositionService;

    /// @dev CVG token
    ICvg public cvg;

    /// @dev Next bond ID to be created
    uint256 public nextBondId;

    /// @dev parameters of the bond
    mapping(uint256 => IBondStruct.BondParams) public bondParams; // bondId => bondParams

    /// @dev amount of CVG minted with this bond
    mapping(uint256 => uint256) public cvgSold; // bondId => cvgSold

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                            INFOS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /// @dev bond information for tokens
    mapping(uint256 => IBondStruct.BondPending) public positionInfos; // tokenId => bond information

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                            V2
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /// @dev ID created for the reantrancy lock
    bytes32 private constant LOCK = keccak256("LOCK");

    IWETH private constant WETH = IWETH(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    /// @dev Determines if locking CVG is mandatory on the bondId.
    mapping(uint256 => bool) public isLockedMandatory; // bondId => isLockedMandatory

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                            EVENTS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    event BondCreated(IBondStruct.BondCreateStruct[] bondParams);
    struct RedeemEventStruct {
        uint256 tokenId;
        uint256 payout;
        uint256 vestingLeft;
    }
    event BondRedeemed(address indexed recipient, RedeemEventStruct[] redeemData);

    event BondDeposit(
        uint256 tokenId,
        uint256 bondId,
        address account,
        uint256 amountDeposited,
        uint256 amountDepositedUsd,
        uint256 cvgMinted,
        uint256 vestingEnd
    );

    event BondDepositToLock(
        uint256 bondId,
        uint256 amountDeposited,
        uint256 cvgMinted,
        uint256 amountDepositedUsd,
        uint256 tokenIdLock
    );

    modifier lockReentrancy() {
        /// @dev Reentrancy lock check
        require(_tload(LOCK) == 0, "NOT_LOCKED");

        /// @dev Reentrancy lock set
        _tstore(LOCK, 1);

        _;

        /// @dev Reentrancy lock clear
        _tstore(LOCK, 0);
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                            SETTERS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /**
     *  @notice Create several bond orders
     *  @param _bondCreateParams Array of Bond parameters of bonds to create
     */
    function createBond(IBondStruct.BondCreateStruct[] calldata _bondCreateParams) external onlyOwner {
        uint256 _nextBondId = nextBondId;

        for (uint256 i; i < _bondCreateParams.length; ) {
            require(
                _bondCreateParams[i].bondParams.percentageOneTx <= MAXIMUM_PERCENTAGE_PER_DEPOSIT,
                "INVALID_MAX_PERCENTAGE"
            );
            require(_bondCreateParams[i].bondParams.startBondTimestamp >= block.timestamp, "START_IN_PAST");
            require(
                _bondCreateParams[i].bondParams.minRoi <= _bondCreateParams[i].bondParams.maxRoi,
                "MIN_ROI_TOO_HIGH"
            );
            require(_bondCreateParams[i].bondParams.maxRoi < MAXIMUM_ROI, "INVALID_MAX_ROI");
            bondParams[_nextBondId] = _bondCreateParams[i].bondParams;
            isLockedMandatory[_nextBondId] = _bondCreateParams[i].isLockMandatory;
            unchecked {
                ++_nextBondId;
                ++i;
            }
        }

        nextBondId = _nextBondId;

        emit BondCreated(_bondCreateParams);
    }

    struct UpdateBondParams {
        uint256 bondId;
        IBondStruct.BondFunction composedFunction;
        uint24 percentageOneTx;
        uint24 minRoi;
        uint24 maxRoi;
    }

    /**
     *  @notice Updates parameters that can be update on several bondId.
     *  @param _updateBondParams Array of struct param for updating a bond.
     */
    function updateBondParams(UpdateBondParams[] calldata _updateBondParams) external onlyOwner {
        uint256 _nextBondId = nextBondId;

        for (uint256 i; i < _updateBondParams.length; ) {
            uint256 bondId = _updateBondParams[i].bondId;
            require(bondId < _nextBondId, "BOND_NOT_EXISTING");
            require(_updateBondParams[i].percentageOneTx < MAXIMUM_PERCENTAGE_PER_DEPOSIT, "INVALID_PERCENTAGE_MAX");
            require(_updateBondParams[i].minRoi <= _updateBondParams[i].maxRoi, "MIN_ROI_TOO_HIGH");
            require(_updateBondParams[i].maxRoi < MAXIMUM_ROI, "INVALID_MAX_ROI");
            /// @dev Owner cannot reduce old min & max ROI
            require(bondParams[bondId].minRoi <= _updateBondParams[i].minRoi, "MIN_ROI_DECREASED");
            require(bondParams[bondId].maxRoi <= _updateBondParams[i].maxRoi, "MAX_ROI_DECREASED");

            bondParams[bondId].composedFunction = _updateBondParams[i].composedFunction;
            bondParams[bondId].percentageOneTx = _updateBondParams[i].percentageOneTx;
            bondParams[bondId].minRoi = _updateBondParams[i].minRoi;
            bondParams[bondId].maxRoi = _updateBondParams[i].maxRoi;

            unchecked {
                ++i;
            }
        }
    }

    /**
     *  @notice Pause/Unpause the deposit on several bonds.
     *  @param bondIds Bond Ids of the bond to toggle the pause on
     */
    function togglePause(uint256[] calldata bondIds) external onlyOwner {
        for (uint256 i; i < bondIds.length; ) {
            bondParams[bondIds[i]].isPaused = !bondParams[bondIds[i]].isPaused;

            unchecked {
                ++i;
            }
        }
    }

    /**
     *  @notice Allows to collect WETH deposited through bond or any tokens sent to the contracts.
     *  @param _erc20s Bond Ids of the bond to toggle the pause on
     */
    function withdrawTokens(IERC20[] calldata _erc20s) external onlyOwner {
        address pod = cvgControlTower.treasuryPod();
        for (uint256 i; i < _erc20s.length; ) {
            _erc20s[i].transfer(pod, _erc20s[i].balanceOf(address(this)));
            unchecked {
                ++i;
            }
        }
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        DEPOSIT FUNCTIONS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /**
     *  @notice Deposit asset into a bond in exchange of a tokenized position embedding vested CVG.
     *  @param bondId Id of the bond to create or update the position.
     *  @param tokenId If tokenID = 0, mints a new position, else increase an already existing position.
     *  @param amountIn amount of tokens to bond
     *  @param cvgAmountOutMin amount of tokens to bond
     *  @param receiver address of the receiver
     */
    function deposit(
        uint256 bondId,
        uint256 tokenId,
        uint256 amountIn,
        uint256 cvgAmountOutMin,
        address receiver
    ) external payable lockReentrancy {
        ICvgControlTower _cvgControlTower = cvgControlTower;

        require(!isLockedMandatory[bondId], "BOND_WITH_MANDATORY_LOCK");

        uint256 _tokenId = bondPositionManager.mintOrCheck(bondId, tokenId, tokenId == 0 ? receiver : msg.sender);

        /// @dev Get the amount of CVG already sold on this bondId.
        uint256 cvgAlreadyMinted = cvgSold[bondId];
        /// @dev Get the bond parameters.
        IBondStruct.BondParams memory _bondParams = bondParams[bondId];

        /// @dev If user send ETH
        if (msg.value != 0) {
            /// @dev We verify the bond is in WETH
            require(_bondParams.token == address(WETH), "NOT_ETH_BOND");
            /// @dev and we increment the amountIn in WETH with the ETH
            amountIn += msg.value;
        }

        /// @dev We verify that the user gave some token
        require(amountIn != 0, "LTE");

        /// @dev Verifies that the bond is not paused.
        require(!_bondParams.isPaused, "BOND_PAUSED");
        /// @dev Verifies that the bond has started.
        require(block.timestamp >= _bondParams.startBondTimestamp, "BOND_NOT_STARTED");
        /// @dev Verifies that the bond is not expired.
        require(block.timestamp <= _bondParams.startBondTimestamp + _bondParams.bondDuration, "BOND_INACTIVE");
        /// @dev Fetches the price of the CVG & the asset used to buy CVG.
        (uint256 cvgPrice, uint256 assetPrice) = _cvgControlTower.cvgOracle().getAndVerifyTwoPrices(
            address(cvg),
            _bondParams.token
        );
        /// @dev Computes the amount in dollar deposited under 18 decimals
        uint256 depositedUsdValue = (amountIn * assetPrice) / 10 ** IERC20Metadata(_bondParams.token).decimals();
        /// @dev Compute the number of CVG to mint
        uint256 cvgToBuy = (depositedUsdValue * 10 ** 18) /
            ((cvgPrice *
                (MAXIMUM_ROI -
                    _cvgControlTower.bondCalculator().computeRoi(
                        block.timestamp - _bondParams.startBondTimestamp,
                        _bondParams.bondDuration,
                        _bondParams.composedFunction,
                        _bondParams.cvgToSell,
                        cvgAlreadyMinted,
                        _bondParams.gamma,
                        _bondParams.scale,
                        _bondParams.minRoi,
                        _bondParams.maxRoi
                    ))) / MAXIMUM_ROI);

        require(cvgToBuy != 0, "ZERO_BUY");
        require(cvgToBuy >= cvgAmountOutMin, "SLIPPAGE_ERROR");

        /// @dev Verifies that the maximum of CVG to sell in one tx is not bigger than the % setup.
        require(
            cvgToBuy <= (uint256(_bondParams.percentageOneTx) * _bondParams.cvgToSell) / MAXIMUM_PERCENTAGE_PER_DEPOSIT,
            "MAX_CVG_PER_BOND"
        );
        /// @dev Verifies that the total cap of CVG to sell is not reached by incrementing this new amount.
        require(cvgToBuy + cvgAlreadyMinted <= _bondParams.cvgToSell, "MAX_CVG_ALREADY_MINTED");
        uint256 _bondId = bondId;
        /// @dev Increments the amount of CVG sold.
        cvgSold[_bondId] = cvgToBuy + cvgAlreadyMinted;

        positionInfos[_tokenId] = IBondStruct.BondPending({
            leftClaimable: positionInfos[_tokenId].leftClaimable + uint128(cvgToBuy),
            vestingTimeLeft: _bondParams.vestingTerm,
            lastTimestamp: uint64(block.timestamp)
        });

        /// @dev If msg.value > 0
        if (msg.value != 0) {
            /// @dev Wraps ETH in WETH on the contract
            WETH.deposit{value: msg.value}();
            /// @dev Removes ETH amount to have the amount of WETH to transfer
            uint256 amountWETH = amountIn - msg.value;

            if (amountWETH != 0) {
                /// @dev deposit asset in the POD
                IERC20Metadata(_bondParams.token).safeTransferFrom(
                    msg.sender,
                    _cvgControlTower.treasuryPod(),
                    amountWETH
                );
            }
        } else {
            /// @dev deposit asset in the POD
            IERC20Metadata(_bondParams.token).safeTransferFrom(msg.sender, _cvgControlTower.treasuryPod(), amountIn);
        }

        emit BondDeposit(
            _tokenId,
            _bondId,
            receiver,
            amountIn,
            depositedUsdValue,
            cvgToBuy,
            block.timestamp + _bondParams.vestingTerm
        );
    }

    /**
     *  @notice Deposit into bond with the goal to lock CVG tokens after.
     *          This call doesn't give a bond position but create or increase a locking position.
     *  @param bondId Id of the bond
     *  @param amountIn Amount of token to deposit in the bond
     *  @param cvgAmountOutMin Minimum amount of CVG to obtain on the deposit (slippage)
     *  @param lockTokenId Token ID of the Locking Position, if 0 mints a new position.
     *  @param duration  Amount of cycle to increase or create a lock
     *  @param ysPercentage For TokenID = 0, ysPercentage of the locking position
     */
    function depositAndLock(
        uint256 bondId,
        uint256 amountIn,
        uint96 cvgAmountOutMin,
        uint256 lockTokenId,
        uint24 duration,
        uint8 ysPercentage
    ) external payable lockReentrancy {
        ICvgControlTower _cvgControlTower = cvgControlTower;

        /// @dev Get the amount of CVG already sold on this bondId.
        uint256 cvgAlreadyMinted = cvgSold[bondId];
        /// @dev Get the bond parameters.
        IBondStruct.BondParams memory _bondParams = bondParams[bondId];

        /// @dev If user send ETH
        if (msg.value != 0) {
            /// @dev We verify the bond is in WETH
            require(_bondParams.token == address(WETH), "NOT_ETH_BOND");
            /// @dev and we increment the amountIn in WETH with the ETH
            amountIn += msg.value;
        }

        require(amountIn != 0, "LTE");

        /// @dev Verifies that the bond is not paused.
        require(!_bondParams.isPaused, "BOND_PAUSED");

        /// @dev Verifies that the bond has started.
        require(block.timestamp >= _bondParams.startBondTimestamp, "BOND_NOT_STARTED");
        /// @dev Verifies that the bond is not expired.
        require(block.timestamp <= _bondParams.startBondTimestamp + _bondParams.bondDuration, "BOND_INACTIVE");
        /// @dev Fetches the price of the CVG & the asset used to buy CVG.
        (uint256 cvgPrice, uint256 assetPrice) = _cvgControlTower.cvgOracle().getAndVerifyTwoPrices(
            address(cvg),
            _bondParams.token
        );
        /// @dev Computes the amount in dollar deposited under 18 decimals
        uint256 depositedUsdValue = (amountIn * assetPrice) / 10 ** IERC20Metadata(_bondParams.token).decimals();
        /// @dev Compute the number of CVG to mint
        uint96 cvgToBuy = uint96(
            (depositedUsdValue * 10 ** 18) /
                ((cvgPrice *
                    (MAXIMUM_ROI -
                        _cvgControlTower.bondCalculator().computeRoi(
                            block.timestamp - _bondParams.startBondTimestamp,
                            _bondParams.bondDuration,
                            _bondParams.composedFunction,
                            _bondParams.cvgToSell,
                            cvgAlreadyMinted,
                            _bondParams.gamma,
                            _bondParams.scale,
                            _bondParams.minRoi,
                            _bondParams.maxRoi
                        ))) / MAXIMUM_ROI)
        );

        require(cvgToBuy != 0, "ZERO_BUY");
        require(cvgToBuy >= cvgAmountOutMin, "SLIPPAGE_ERROR");

        /// @dev Verifies that the maximum of CVG to sell in one tx is not bigger than the % setup.
        require(
            cvgToBuy <= (uint256(_bondParams.percentageOneTx) * _bondParams.cvgToSell) / MAXIMUM_PERCENTAGE_PER_DEPOSIT,
            "MAX_CVG_PER_BOND"
        );
        /// @dev Verifies that the total cap of CVG to sell is not reached by incrementing this new amount.
        require(cvgToBuy + cvgAlreadyMinted <= _bondParams.cvgToSell, "MAX_CVG_ALREADY_MINTED");
        /// @dev Increments the amount of CVG sold.
        cvgSold[bondId] = cvgToBuy + cvgAlreadyMinted;

        /// @dev If msg.value > 0
        if (msg.value != 0) {
            /// @dev Wraps ETH in WETH on the contract
            WETH.deposit{value: msg.value}();
            /// @dev Removes ETH amount to have the amount of WETH to transfer
            uint256 amountWETH = amountIn - msg.value;

            if (amountWETH != 0) {
                /// @dev deposit asset in the POD
                IERC20Metadata(_bondParams.token).safeTransferFrom(
                    msg.sender,
                    _cvgControlTower.treasuryPod(),
                    amountWETH
                );
            }
        } else {
            /// @dev deposit asset in the POD
            IERC20Metadata(_bondParams.token).safeTransferFrom(msg.sender, _cvgControlTower.treasuryPod(), amountIn);
        }

        cvg.mintBond(address(this), cvgToBuy);

        ILockingPositionService _lockingPositionService = lockingPositionService;

        require(
            // solhint-disable-next-line avoid-tx-origin
            msg.sender == tx.origin || _lockingPositionService.isContractLocker(msg.sender),
            "NOT_CONTRACT_OR_WL"
        );
        /// @dev It's a mint if lock tokenId is 0
        if (lockTokenId == 0) {
            /// @dev mint locking position
            require(duration >= MINIMUM_LOCK_DURATION, "LOCK_DURATION_NOT_LONG_ENOUGH");
            _lockingPositionService.mintPosition(duration, cvgToBuy, ysPercentage, msg.sender, true);
        }
        /// @dev Else, it's an increaseLockAmount OR increaseLockTime&Amount
        else {
            uint96 endCycle = _lockingPositionService.lockingPositions(lockTokenId).lastEndCycle;
            uint128 actualCycle = _cvgControlTower.cvgCycle();

            /// @dev increase locking position time and amount
            if (duration != 0) {
                require(actualCycle + MINIMUM_LOCK_DURATION <= endCycle + duration, "ADDED_LOCK_DURATION_NOT_ENOUGH");
                _lockingPositionService.increaseLockTimeAndAmount(lockTokenId, duration, cvgToBuy, msg.sender);
            }
            /// @dev increase locking position amount
            else {
                require(actualCycle + MINIMUM_LOCK_DURATION <= endCycle, "REMAINING_LOCK_DURATION_TOO_LOW");
                _lockingPositionService.increaseLockAmount(lockTokenId, cvgToBuy, msg.sender);
            }
        }

        emit BondDepositToLock(bondId, amountIn, cvgToBuy, depositedUsdValue, lockTokenId);
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        REDEEM FUNCTIONS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /**
     *  @notice Redeem several bond positions of vested CVG.
     *  @param tokenIds Array of position id to redeem CVG on.
     *  @param recipient Receiver of the CVG
     */
    function redeem(uint256[] calldata tokenIds, address recipient) external {
        /// @dev Incremented value of all bond redeemed
        uint128 cvgToMint;
        RedeemEventStruct[] memory emittedEvent = new RedeemEventStruct[](tokenIds.length);
        uint256 counterEvent;
        require(tokenIds.length != 0, "NO_POSITION_TO_REDEEM");
        /// @dev Redeem tokenized positions

        bondPositionManager.checkTokenRedeem(tokenIds, msg.sender);

        for (uint256 i; i < tokenIds.length; ) {
            uint256 tokenId = tokenIds[i];

            IBondStruct.BondPending memory bondPending = positionInfos[tokenId];
            uint128 payout;
            uint256 delta = block.timestamp - bondPending.lastTimestamp;
            uint64 vestingTimeLeft = bondPending.vestingTimeLeft;
            /// @dev Revert if vesting not existing
            require(vestingTimeLeft != 0, "NOTHING_TO_CLAIM");
            uint128 percentVested = uint128((delta * MAXIMUM_PERCENTAGE_VESTING) / vestingTimeLeft);
            /// @dev payout is the total left amount to claim
            if (percentVested >= MAXIMUM_PERCENTAGE_VESTING) {
                payout = bondPending.leftClaimable;
                vestingTimeLeft = 0;

                cvgToMint += bondPending.leftClaimable;
                delete positionInfos[tokenId];
            }
            /// @dev payout is computed proportionally with the time that left in the vesting
            else {
                payout = (bondPending.leftClaimable * percentVested) / uint128(MAXIMUM_PERCENTAGE_VESTING);
                vestingTimeLeft = uint64(vestingTimeLeft + bondPending.lastTimestamp - block.timestamp);

                cvgToMint += payout;
                positionInfos[tokenId] = IBondStruct.BondPending({
                    leftClaimable: bondPending.leftClaimable - payout,
                    vestingTimeLeft: vestingTimeLeft,
                    lastTimestamp: uint64(block.timestamp)
                });
            }
            require(payout != 0, "NO_PAYOUT");
            emittedEvent[counterEvent++] = RedeemEventStruct({
                tokenId: tokenId,
                payout: payout,
                vestingLeft: vestingTimeLeft
            });
            unchecked {
                ++i;
            }
        }

        /// @dev Mints all redeemed bonds
        cvg.mintBond(recipient, cvgToMint);

        emit BondRedeemed(recipient, emittedEvent); // emit bond data
    }

    /* =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=
                        VIEW FUNCTIONS
    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-= */

    /**
     *  @notice Compute bond price in USD with 18 decimals.
     *  @return cvgPriceDiscounted uint256
     */
    function depositRoi(uint256 bondId, IBondStruct.BondParams memory _bondParams) public view returns (uint256) {
        return
            cvgControlTower.bondCalculator().computeRoi(
                block.timestamp - _bondParams.startBondTimestamp,
                _bondParams.bondDuration,
                _bondParams.composedFunction,
                _bondParams.cvgToSell,
                cvgSold[bondId],
                _bondParams.gamma,
                _bondParams.scale,
                _bondParams.minRoi,
                _bondParams.maxRoi
            );
    }

    /**
     *  @notice Calculate available amount of CVG to claim by depositor.
     *  @param tokenId ID of a token
     *  @return pendingPayout uint
     */
    function pendingPayoutFor(uint256 tokenId) public view returns (uint256) {
        return (positionInfos[tokenId].leftClaimable * percentVestedFor(tokenId)) / MAXIMUM_PERCENTAGE_VESTING;
    }

    /**
     *  @notice Calculate how far into vesting a depositor is.
     *  @param tokenId ID of a token
     *  @return percentVested uint256
     */
    function percentVestedFor(uint256 tokenId) public view returns (uint256) {
        uint256 percentVested;
        uint256 blocksSinceLast;
        uint256 vesting;

        blocksSinceLast = block.timestamp - positionInfos[tokenId].lastTimestamp;
        vesting = positionInfos[tokenId].vestingTimeLeft;

        if (vesting != 0) {
            percentVested = (blocksSinceLast * MAXIMUM_PERCENTAGE_VESTING) / vesting;
            return percentVested > MAXIMUM_PERCENTAGE_VESTING ? MAXIMUM_PERCENTAGE_VESTING : percentVested; //max 100%
        }
        return percentVested;
    }

    /**
     *  @notice Get bond information of tokens.
     *  @param tokenIds IDs of the tokens
     *  @return array of bond information
     */
    function getBondInfosPerTokenIds(
        uint256[] calldata tokenIds
    ) external view returns (IBondStruct.BondTokenView[] memory) {
        uint256 length = tokenIds.length;
        IBondStruct.BondTokenView[] memory bondTokens = new IBondStruct.BondTokenView[](length);
        for (uint256 index; index < length; ) {
            uint256 tokenId = tokenIds[index];
            IBondStruct.BondPending memory bondPending = positionInfos[tokenId];
            IBondStruct.BondTokenView memory bondToken = IBondStruct.BondTokenView({
                claimableCvg: pendingPayoutFor(tokenId),
                leftClaimable: bondPending.leftClaimable,
                lastTimestamp: bondPending.lastTimestamp,
                vestingEnd: bondPending.lastTimestamp + bondPending.vestingTimeLeft
            });
            bondTokens[index] = bondToken;
            unchecked {
                ++index;
            }
        }
        return bondTokens;
    }

    /**
     *  @notice Get vesting information about a specific bond token.
     *  @param tokenId ID of the token
     *  @return vestingInfos vesting information
     */
    function getTokenVestingInfo(
        uint256 tokenId
    ) external view returns (IBondStruct.TokenVestingInfo memory vestingInfos) {
        IBondStruct.BondPending memory infos = positionInfos[tokenId];

        uint256 claimable = (infos.leftClaimable * percentVestedFor(tokenId)) / MAXIMUM_PERCENTAGE_VESTING;

        vestingInfos = IBondStruct.TokenVestingInfo({
            term: infos.lastTimestamp + infos.vestingTimeLeft,
            claimable: claimable,
            pending: infos.leftClaimable - claimable
        });
    }

    function getBondViews(uint256 from, uint256 to) external view returns (IBondStruct.BondViewV2[] memory) {
        uint256 _nextBondId = nextBondId;
        require(from < _nextBondId, "FROM_GREATER_THAN_NEXTID");
        require(from <= to, "FROM_GREATER_THAN_TO");
        if (_nextBondId <= to) {
            to = _nextBondId - 1;
        }

        IBondStruct.BondViewV2[] memory bondViews = new IBondStruct.BondViewV2[](to - from + 1);
        for (uint256 counter; from <= to; ) {
            bondViews[counter] = _getBondView(from);

            unchecked {
                ++counter;
                ++from;
            }
        }
        return bondViews;
    }

    /**
     *  @notice Get bond information.
     *  @return bondView bond information
     */
    function _getBondView(uint256 bondId) internal view returns (IBondStruct.BondViewV2 memory) {
        IBondStruct.BondParams memory _bondParams = bondParams[bondId];
        IERC20Metadata token = IERC20Metadata(_bondParams.token);
        uint256 _usdAssetExecutionPrice;
        uint256 _usdCvgExecutionPrice;
        uint256 _assetLimitPrice;
        uint256 _cvgExecutionPrice;

        bool isOracleValid;

        {
            (
                uint256 usdExecutionPrice,
                uint256 assetLimitPrice,
                bool isAssetValid,
                uint256 cvgExecutionPrice,
                ,
                bool isCvgValid
            ) = cvgControlTower.cvgOracle().getTwoPricesAndIsValid(address(token), address(cvg));

            _usdAssetExecutionPrice = usdExecutionPrice;
            _usdCvgExecutionPrice = cvgExecutionPrice;
            _assetLimitPrice = assetLimitPrice;
            _cvgExecutionPrice = cvgExecutionPrice;
            isOracleValid = isAssetValid && isCvgValid;
        }

        uint256 actualRoi = _bondParams.startBondTimestamp <= block.timestamp
            ? depositRoi(bondId, _bondParams)
            : _bondParams.maxRoi;
        uint256 usdBondPrice = (_cvgExecutionPrice * (MAXIMUM_ROI - actualRoi)) / MAXIMUM_ROI;
        uint256 _bondId = bondId;
        return
            IBondStruct.BondViewV2({
                actualRoi: actualRoi,
                cvgAlreadySold: cvgSold[_bondId],
                usdExecutionPrice: _usdAssetExecutionPrice,
                usdLimitPrice: _assetLimitPrice,
                assetBondPrice: _usdAssetExecutionPrice == 0 ? 0 : (usdBondPrice * 10 ** 18) / _usdAssetExecutionPrice,
                usdBondPrice: usdBondPrice,
                isOracleValid: isOracleValid,
                bondParameters: _bondParams,
                token: IBondStruct.ERC20View({
                    decimals: token.decimals(),
                    token: token.symbol(),
                    tokenAddress: address(token)
                }),
                isLockingMandatory: isLockedMandatory[_bondId]
            });
    }

    function _tstore(bytes32 location, uint256 value) private {
        assembly {
            tstore(location, value)
        }
    }

    function _tload(bytes32 location) private view returns (uint256 value) {
        assembly {
            value := tload(location)
        }
    }
}

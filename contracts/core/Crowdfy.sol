// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.15;

import "../interfaces/CrowdfyI.sol";
import "../interfaces/external/IUniswapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "../YieldCrowdfy.sol";
import "../CrowdfyToken.sol";
import "../interfaces/CrowdfyFabricI.sol";

import "hardhat/console.sol";

///@title crowdfy crowdfunding contract
contract Crowdfy is YieldCrowdfy {
    using SafeERC20 for IERC20;
    //** **************** ENUMS ********************** */

    //The posible states of the campaign
    enum State {
        Ongoing,
        Failed,
        Succeded,
        Finalized,
        EarlySuccess
    }

    //** **************** EVENTS ********************** */

    event ContributionMade(
        address indexed _contributor,
        uint256 indexed _amount,
        uint256 indexed _time
    ); // fire when a contribution is made
    event MinimumReached(string); //fire when the campaign reached the minimum amoun to succced
    event BeneficiaryWitdraws(address _beneficiaryAddress, uint256 _amount); //fire when the beneficiary withdraws found
    //fire when the contributor recive the founds if the campaign fails
    event ContributorRefounded(
        address _payoutDestination,
        uint256 _payoutAmount
    );
    event CampaignFinished(
        uint8 _state,
        uint256 _timeOfFinalization,
        uint256 _amountRised
    );
    event NewEarning(uint256 _earningMade);

    event CampaignClosed(
        address indexed creator,
        uint256 fundGoal,
        uint256 timestamp
    );

    //** **************** STRUCTS ********************** */

    //Campaigns dataStructure
    struct Campaign {
        string campaignName;
        uint256 fundingGoal; //the minimum amount that the campaigns required
        uint256 fundingCap; //the maximum amount that the campaigns required
        uint256 deadline;
        address beneficiary; //the beneficiary of the campaign
        address owner; //the creator of the campaign
        uint256 created; // the time when the campaign was created
        State state; //the current state of the campaign
        address selectedToken; //the token that the beneficiary seletcted
        uint256 amountRised; //the total amount that the campaign has been collected
    }

    //Contribution datastructure
    struct Contribution {
        address sender;
        uint256 value;
        uint256 numberOfContributions;
    }

    //** **************** STATE VARIABLES ********************** */
    bool public isInitialized = false;
    address public fabricContractAddress; //sets the owner of the protocol to make earnings

    //all the contribution made
    Contribution[] public contributions;
    // contributions made by people
    mapping(address => Contribution) public contributionsByPeople;

    uint256 public amountToWithdraw; // the amount that the bneficiary is able to withdraw
    uint256 public withdrawn = 0; // the current amount that the beneficiary has withdrow
    //the actual campaign
    Campaign public theCampaign;

    //keeps track if a contributor has already been refunded
    mapping(address => bool) hasRefunded;
    //keeps track if a contributor has already been contributed
    mapping(address => bool) hasContributed;

    IUniswapRouter public swapRouterV3;
    IQuoter public quoter;
    address public constant WETH9 = 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6;

    uint24 public constant poolFee = 3000; //0.3% uniswap pool fee

    //** **************** MODIFIERS ********************** */

    modifier inState(State[2] memory _expectedState) {
        require(
            getState() == _expectedState[0] || getState() == _expectedState[1],
            "Not Permited during this state of the campaign."
        );
        _;
    }

    //** **************** FUNCTIONS CODE ********************** */

    function isEth() public view returns (bool _isEth) {
        _isEth = theCampaign.selectedToken ==
            0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE ||
            theCampaign.selectedToken == address(0)
            ? true
            : false;
    }

    function _areRelated(address _address) private view returns (bool) {
        return
            theCampaign.owner == _address ||
            theCampaign.beneficiary == _address;
    }

    function contributionsLength() external view returns (uint256) {
        return contributions.length;
    }

    function protocolOwner() public view returns (address _protocolOwner) {
        _protocolOwner = CrowdfyFabricI(fabricContractAddress).protocolOwner();
    }

    function crowdfyTokenAddress()
        public
        view
        returns (address _crowdfyTokenAddress)
    {
        _crowdfyTokenAddress = CrowdfyFabricI(fabricContractAddress)
            .crowdfyTokenAddress();
    }

    //quote how much would cost swap _amountOut of selected token per
    function quotePrice(
        bool _isInput,
        uint256 _amountOut,
        address _tokenIn,
        address _tokenOut
    ) external payable returns (uint256) {
        uint24 _fee = 500;
        uint160 sqrtPriceLimitX96 = 0;
        if (_isInput) {
            return
                quoter.quoteExactInputSingle(
                    _tokenIn,
                    _tokenOut,
                    _fee,
                    _amountOut,
                    sqrtPriceLimitX96
                );
        } else {
            return
                quoter.quoteExactOutputSingle(
                    _tokenIn,
                    _tokenOut,
                    _fee,
                    _amountOut,
                    sqrtPriceLimitX96
                );
        }
    }

    /**@notice stores the amount that the user has contribute to the campaign.
     * 
    * @param _amount the amount that the user has contrubuted. Measuered in the selected token 
    * 
    * @dev this function evalueates if the user already has contribute, if that's true: rewrites the existing transaction datastructure asociate with this user incrementing the number of transct made by this user and increment sum the value of the contribution.

    *if not: creates a new contribution datastructure and points that contribution with the user that made it

    * also, if the amountRised >= fundingGoal sets to true the minimum collected variable

        * and if the deadline > block.timestamp && amountRised >= fundingCap sets the state of the campaign to success

    REQUIREMENTS:
        value must be > 0
        only permited during ongoing and earlySuccess state

    */
    function _contribute(uint256 _amount)
        private
        inState([State.Ongoing, State.EarlySuccess])
    {
        if (hasContributed[msg.sender]) {
            Contribution storage theContribution = contributionsByPeople[
                msg.sender
            ];
            theContribution.value += _amount;
            theContribution.numberOfContributions++;
            contributions.push(theContribution);
        } else {
            Contribution memory newContribution = Contribution(
                msg.sender,
                _amount,
                1
            );
            contributions.push(newContribution);
            contributionsByPeople[msg.sender] = contributions[
                contributions.length - 1
            ];
            CrowdfyToken(crowdfyTokenAddress()).mint(msg.sender, 50);
            hasContributed[msg.sender] = true;
        }

        theCampaign.amountRised += _amount;
        amountToWithdraw += _amount;
        emit ContributionMade(msg.sender, _amount, block.timestamp);
        if (theCampaign.state != getState()) theCampaign.state = getState();
    }

    function contribute(uint256 _deadline, uint256 _amount)
        external
        payable
        inState([State.Ongoing, State.EarlySuccess])
    {
        require(msg.value > 0, "You have o set an amount greater than 0");

        uint256 amount;

        if (!isEth()) {
            amount = _amount;
            convertTo(
                false,
                amount,
                _deadline,
                msg.sender,
                msg.value,
                WETH9,
                theCampaign.selectedToken
            );
        } else {
            amount = msg.value;
        }
        _contribute(amount);
    }

    function closeCampaign()
        external
        inState([State.Ongoing, State.EarlySuccess])
    {
        require(
            _areRelated(msg.sender),
            "Only owner or beneficiary can cancel"
        );

        if (getState() == State.EarlySuccess)
            theCampaign.state = State.Succeded;
        else if (getState() == State.Ongoing) theCampaign.state = State.Failed;

        emit CampaignClosed(
            theCampaign.owner,
            theCampaign.fundingGoal,
            theCampaign.deadline
        );
    }

    /**@notice allows beneficiary to withdraw the founds of the campaign if this was succeded

    *@dev first stores the amount that the beneficiary is able to withdraw:
            amountToWithdraw(the amount that the campaign has been collected) 
            - 
            withdrawn(the amount that the beneficiary has withdrawing. starts at 0)
        this is store in "toWithdraw"

        second, add that amount "toWithdraw" the the quantity that the beneficiary has already withdrawing "withdrawn"

        third, substaract the amount that the beneficiary has withdrawn to the amount that the bneficiary is able to withdraw
    */
    function withdraw()
        external
        payable
        inState([State.Succeded, State.EarlySuccess])
    {
        require(
            theCampaign.beneficiary == msg.sender,
            "Only the beneficiary can call this function"
        );
        require(
            !isYielding,
            "You cannot withdraw your funds if you are yielding"
        );
        uint256 toWithdraw;
        uint256 earning = _getPercentageFee(amountToWithdraw);
        amountToWithdraw -= earning;
        address actualProtocolOwner = protocolOwner();
        //sends to the deployer of the protocol a earning of 1%
        if (!isEth()) {
            IERC20(theCampaign.selectedToken).safeTransfer(
                actualProtocolOwner,
                earning
            );
        } else {
            (bool success, ) = actualProtocolOwner.call{value: earning}("");
            require(success, "Refund failed");
        }
        // prevents errors for underflow
        amountToWithdraw < withdrawn
            ? toWithdraw = withdrawn - amountToWithdraw
            : toWithdraw = amountToWithdraw - withdrawn;

        // WARNING: posible error due overflow prevent mechanism (but that would be is a lot of ether)
        withdrawn += amountToWithdraw;

        amountToWithdraw = 0; //prevents reentrancy
        if (!isEth()) {
            IERC20(theCampaign.selectedToken).safeTransfer(
                theCampaign.beneficiary,
                toWithdraw
            );
        } else {
            (bool success, ) = theCampaign.beneficiary.call{value: toWithdraw}(
                ""
            );
            require(success, "Refund failed");
        }
        emit BeneficiaryWitdraws(theCampaign.beneficiary, toWithdraw);

        //if the beneficiary has withdrawn an amount equal to the funding cap, finish the campaign
        if (withdrawn >= theCampaign.fundingCap) {
            theCampaign.state = State.Finalized;
            emit CampaignFinished(
                uint8(getState()),
                block.timestamp,
                theCampaign.amountRised
            );
        }
    }

    /**@notice claim a refund if the campaign was failed and only if you are a contributor
    @dev this follows the withdraw pattern to prevent reentrancy
    */
    function claimFounds(
        bool inEth,
        uint256 _amount,
        uint256 _deadline
    ) external payable inState([State.Failed, State.Failed]) {
        require(hasContributed[msg.sender], "You didnt contributed");
        require(!hasRefunded[msg.sender], "You already has been refunded");
        uint256 toWithdraw = contributionsByPeople[msg.sender].value;
        contributionsByPeople[msg.sender].value = 0;
        if (inEth && !isEth()) {
            TransferHelper.safeApprove(
                theCampaign.selectedToken,
                address(swapRouterV3),
                toWithdraw
            );
            convertTo(
                true,
                _amount,
                _deadline,
                msg.sender,
                toWithdraw,
                theCampaign.selectedToken,
                WETH9
            );
        } else if (isEth()) {
            (bool success, ) = msg.sender.call{value: toWithdraw}("");
            require(success, "Refund failed");
        } else if (!inEth && !isEth()) {
            IERC20(theCampaign.selectedToken).safeTransfer(
                msg.sender,
                toWithdraw
            );
        }
        hasRefunded[msg.sender] = true;
        emit ContributorRefounded(msg.sender, toWithdraw);
    }

    /**@notice creates a new instance campaign
        @dev use CREATE in the factory contract 
        REQUIREMENTS:
            due date must be major than the current block time

            campaign cannot be initialized from iniside or cannot be initialized more than once a particular campaign
     */
    function initializeCampaign(
        string calldata _campaignName,
        uint256 _fundingGoal,
        uint256 _deadline,
        uint256 _fundingCap,
        address _beneficiaryAddress,
        address _campaignCreator,
        address _fabricContractAddress,
        address _selectedToken
    ) external {
        require(
            _deadline > block.timestamp,
            "Your duedate have to be major than the current time"
        );
        assert(!isInitialized);

        theCampaign = Campaign({
            campaignName: _campaignName,
            fundingGoal: _fundingGoal,
            fundingCap: _fundingCap,
            deadline: _deadline,
            beneficiary: _beneficiaryAddress,
            owner: _campaignCreator,
            created: block.timestamp,
            state: State.Ongoing,
            selectedToken: _selectedToken,
            amountRised: 0
        });
        swapRouterV3 = IUniswapRouter(
            0xE592427A0AEce92De3Edee1F18E0157C05861564
        );
        quoter = IQuoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);
        fabricContractAddress = _fabricContractAddress;
        CrowdfyToken(crowdfyTokenAddress()).mint(_campaignCreator, 100);
        //this avoids someone reinicialize a campaign.
        isInitialized = true;
    }

    /**@notice evaluates the current state of the campaign, its used for the "inState" modifier
    
    @dev 
    */
    function getState() public view returns (Crowdfy.State) {
        if (
            theCampaign.deadline > block.timestamp &&
            theCampaign.amountRised < theCampaign.fundingGoal &&
            withdrawn == 0 &&
            theCampaign.state != State.Failed
        ) {
            return State.Ongoing;
        } else if (
            theCampaign.amountRised >= theCampaign.fundingGoal &&
            theCampaign.amountRised < theCampaign.fundingCap &&
            theCampaign.deadline + 4 weeks >= block.timestamp &&
            theCampaign.state != State.Succeded
        ) {
            return State.EarlySuccess;
        } else if (
            (theCampaign.amountRised >= theCampaign.fundingCap &&
                withdrawn < theCampaign.fundingCap) ||
            (theCampaign.deadline + 4 weeks < block.timestamp &&
                theCampaign.amountRised >= theCampaign.fundingGoal) ||
            theCampaign.state == State.Succeded
        ) {
            return State.Succeded;
        } else if (
            theCampaign.amountRised >= theCampaign.fundingCap &&
            withdrawn >= theCampaign.fundingCap
        ) {
            return State.Finalized;
        } else if (
            (theCampaign.deadline < block.timestamp &&
                theCampaign.amountRised < theCampaign.fundingGoal) ||
            theCampaign.state == State.Failed
        ) {
            return State.Failed;
        }
    }

    /**@notice use to get a revenue of 1% for each contribution made */
    function _getPercentageFee(uint256 num) private pure returns (uint256) {
        return (num * 1) / 100;
    }

    function _getPercentage(uint8 _percentage) private view returns (uint256) {
        return (amountToWithdraw * _percentage) / 100;
    }

    // fallback() external payable {
    //     this.contribute();
    // }
    receive() external payable {}

    function convertTo(
        bool _isInput,
        uint256 _tokenAmountOut,
        uint256 _deadline,
        address _user,
        uint256 _maxEthAmountIn,
        address tknIn,
        address tknOut
    ) internal {
        require(
            _tokenAmountOut > 0,
            "Error, amount out must be greater than 0"
        );
        if (_isInput) {
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: tknIn,
                    tokenOut: tknOut,
                    fee: poolFee,
                    recipient: msg.sender,
                    deadline: _deadline,
                    amountIn: _maxEthAmountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
            swapRouterV3.exactInputSingle(params);
        } else {
            ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter
                .ExactOutputSingleParams({
                    tokenIn: tknIn,
                    tokenOut: tknOut,
                    fee: poolFee,
                    recipient: address(this),
                    deadline: _deadline,
                    amountOut: _tokenAmountOut,
                    amountInMaximum: _maxEthAmountIn,
                    sqrtPriceLimitX96: 0
                });
            swapRouterV3.exactOutputSingle{value: _maxEthAmountIn}(params);
            swapRouterV3.refundETH();
            // Send the refunded ETH back to sender
            (bool success, ) = _user.call{value: address(this).balance}("");
            require(success, "Refund failed");
        }
    }

    function yield(uint8 _percentage)
        external
        payable
        inState([State.Succeded, State.EarlySuccess])
    {
        assert(_areRelated(msg.sender));
        require(isEth(), "Crowdfy: Only allow to yield Eth");
        uint256 amountToYield = _getPercentage(_percentage);
        amountToWithdraw -= amountToYield;
        super.deposit(theCampaign.selectedToken, address(this), amountToYield);
    }

    function withdrawYield()
        external
        inState([State.Succeded, State.EarlySuccess])
    {
        require(_areRelated(msg.sender));
        require(isEth(), "Crowdfy: Only avalible with Eth");
        uint256 amountReturned = super.withdrawYield(
            theCampaign.selectedToken,
            address(this)
        );
        amountToWithdraw += amountReturned;
    }
}

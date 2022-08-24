//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.15;

import "./Crowdfy.sol";
import "./interfaces/CrowdfyFabricI.sol";

import "@openzeppelin/contracts/proxy/Clones.sol";

/**@title Factory contract. Follows minimal proxy pattern to deploy each campaigns*/
contract CrowdfyFabric{


//** **************** STRUCTS ********************** */
    struct Campaign  {
        string  campaignName;
        uint256 fundingGoal;//the minimum amount that the campaigns required
        uint256 fundingCap; //the maximum amount that the campaigns required
        uint256 deadline;
        address beneficiary;//the beneficiary of the campaign
        address owner;//the creator of the campaign
        uint256 created; // the time when the campaign was created 
        address campaignAddress;
        address selectedToken;
    }

    //** **************** STATE VARIABLES ********************** */

    //Stores all campaign structure
    Campaign[] public campaigns;

    //points each campaigns adddress to an identifier.
    mapping(uint256 => address) public campaignsById;

    //the address of the base campaign contract implementation
    address payable immutable campaignImplementation;

    address public protocolOwner;
    
    // list of tokens that a user could select to found the campaign with
    address[] public whitelistedTokensArr;
    mapping(address => uint256) public whitelistedTokensId;
    mapping(address => bool) public isWhitelisted;

    address immutable public swapRouterV3;
    address immutable public quoter;
    address immutable public WETH9;

    //** **************** EVENTS ********************** */

        event CampaignCreated(
            string indexed campaignName,
            address indexed creator, 
            address beneficiary, 
            uint256 fundingGoal, 
            uint256 createdTime, 
            uint256 deadline,
            address selectedToken, 
            address indexed campaignAddress
        );

        event WhitlistedTokensUpdated(
            address[] _newWithlistedTokens
        );
        event WhitelistedTokenRemoved(address _tokenRemoved);

//** **************** CONSTRUCTOR ********************** */

    constructor(address[] memory _whitelistedTokens, address _swapRouterV3, address _quoter, address _weth9){
        swapRouterV3 =_swapRouterV3;
        quoter = _quoter;
        WETH9 =_weth9;
        protocolOwner = msg.sender;
        //deploys the campaign base implementation
        campaignImplementation = payable(address(new Crowdfy(_swapRouterV3, _quoter, _weth9)));
         _setAllWhitelistedTokens(_whitelistedTokens);
    }

    ///@notice deploy a new instance of the campaign
    function createCampaign(
        string calldata _campaignName, 
        uint256 _fundingGoal, 
        uint256 _deadline, 
        uint256 _fundingCap, 
        address _beneficiaryAddress,
        address _selectedToken
    ) external  returns(uint256) {
        require(isWhitelisted[_selectedToken], "Error: Token `_selectedToken` is not on the list");
        require(_beneficiaryAddress != address(0));
        address campaignCreator = msg.sender;
        
        address payable cloneContract  = payable(Clones.clone(campaignImplementation));
        address tkn = whitelistedTokensArr[whitelistedTokensId[_selectedToken]];

        Crowdfy(cloneContract).initializeCampaign( 
            _campaignName,
            _fundingGoal, 
            _deadline,
            _fundingCap, 
            _beneficiaryAddress, 
            campaignCreator,
            protocolOwner,
            tkn
            // if you want to receive your founds in eth you pass address(0)
            // swapRouterV3,
            // quoter,
            // WETH9
        );

       campaigns.push(Campaign(
                {
                campaignName: _campaignName,
                fundingGoal: _fundingGoal,
                fundingCap: _fundingCap,
                deadline: _deadline,
                beneficiary: _beneficiaryAddress,
                owner: campaignCreator,
                created: block.timestamp,
                campaignAddress: address(cloneContract),
                selectedToken: whitelistedTokensArr[whitelistedTokensId[_selectedToken]]
                }
            )
        );

        uint256 campaignId = campaigns.length - 1;

        campaignsById[campaignId] = cloneContract;

        emit CampaignCreated(
                _campaignName, 
                campaignCreator, 
                _beneficiaryAddress, 
                _fundingCap, 
                block.timestamp, 
                _deadline, 
                _selectedToken,
                cloneContract
            );

        return campaignId;
    }

    ///@notice gets the total number number of campaigns created
    function getCampaignsLength() external view returns(uint256){
        return campaigns.length;
    }

    function getTotalTokens() external view returns(uint256) {
        return whitelistedTokensArr.length;
    }

    function _setAllWhitelistedTokens(address[] memory _tokens) public {
        for(uint256 i = 0; i < _tokens.length; i++){
            whitelistedTokensArr.push(_tokens[i]);
            whitelistedTokensId[_tokens[i]] = i;
            isWhitelisted[_tokens[i]] = true;
        }
        emit WhitlistedTokensUpdated(_tokens);
    }

    function _setWhitelistedToken(address _token) public {
        require(!isWhitelisted[_token],"Error: Token `_token` is already on the list");
         whitelistedTokensArr.push(_token);
         whitelistedTokensId[_token] = whitelistedTokensArr.length + 1;
         isWhitelisted[_token] = true;
         emit WhitlistedTokensUpdated(whitelistedTokensArr);
    }

    function _quitWhitelistedToken(address _selectedToken) public {
        require(isWhitelisted[_selectedToken],"Error: Token `_selectedToken` is not on the list");
        isWhitelisted[_selectedToken] = false;
        emit WhitelistedTokenRemoved(_selectedToken);
    }

}

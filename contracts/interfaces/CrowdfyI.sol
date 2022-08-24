//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.15;

interface CrowdfyI {


    /**@notice  allows all users to contribute to the campaign, as the campaign is in ongoing state

    @dev this function evalueates if the user already has contribute, if that's true: rewrites the existing transaction datastructure asociate with this  user incrementing the number of transct made by this user and increment sum the value of the contribution.

    if not: creates a new contribution datastructure and points that contribution with the user that made it

    also if the amountRised >= fundingGoal sets to true the minimum collected variable

        and if the deadline > block.timestamp && amountRised >= fundingCap sets the state of the campaign to success

    REQUIREMENTS:
        value must be > 0
        only permited during ongoing state

    */
    function contribute(uint256 _deadline) external payable;

    /**@notice allows the beneficiary of the campaign withdraw the founds if the campaign was succeded. sets the campaign to state finalize once the user has withdraw

    @dev function follows the reentrancy prevent attack and also uses the .call method to transfer the ether(following the consensys advices) 

    REQUIREMENTS:
        only during success state
        msg.sender == beneficiary
     */
    function withdraw() external payable;


/** @notice allows all the contributors call this functions if the acmpaign was failed 
    @dev this function follows the reentrancy prevent attack pattern for security, allowing one contributor at time to withdraw his founds, as the user has contributed.

    REQUIREMNTS:
        only in state failed
        only user who has contributed to the campaign
        only allows to refound once
    */
    function claimFounds () external payable;


    /**@notice allows factory contract to create new campaigns
    
        @param _campaignName the name of the campaign
        @param _fundingGoal the miinimum amount to make the campaign success
        @param _fundingCap the maximum amount to collect, when reached the campaign 
        closes
        @param _beneficiaryAddress the address ot the beneficiary of the campaign
        @param _protocolOwner the person who deployed the contrac, its used to get earnigs (0.5%) with every contribution.
    @dev this function uses the minimal proxy pattern in his factory to reduce the gas cost of creation of the campaigns

        REQUIREMENTS: 
            _deadline > block.timestamp
     */
      function initializeCampaign
    (
        string calldata _campaignName,
        uint _fundingGoal,
        uint _deadline,
        uint _fundingCap,
        address _beneficiaryAddress,
        address _campaignCreator,
        address _protocolOwner
    ) external;
    
}
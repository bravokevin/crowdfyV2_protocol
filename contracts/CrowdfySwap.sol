// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.15;

// contract CrowdfySwap {
//     function convertTo(
//         bool _isInput,
//         uint256 _tokenAmountExpected,
//         uint256 _deadline,
//         address _user,
//         uint256 _amount,
//         address tknIn,
//         address tknOut
//     ) internal {
//         require(
//             _tokenAmountExpected > 0,
//             "Error, amount out must be greater than 0"
//         );
//         if (_isInput) {
//             ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
//                 .ExactInputSingleParams({
//                     tokenIn: tknIn,
//                     tokenOut: tknOut,
//                     fee: poolFee,
//                     recipient: msg.sender,
//                     deadline: _deadline,
//                     amountIn: _amount,
//                     amountOutMinimum: 0,
//                     sqrtPriceLimitX96: 0
//                 });
//             swapRouterV3.exactInputSingle(params);
//         } else {
//             ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter
//                 .ExactOutputSingleParams({
//                     tokenIn: tknIn,
//                     tokenOut: tknOut,
//                     fee: poolFee,
//                     recipient: address(this),
//                     deadline: _deadline,
//                     amountOut: _tokenAmountExpected,
//                     amountInMaximum: _amount,
//                     sqrtPriceLimitX96: 0
//                 });
//             swapRouterV3.exactOutputSingle{value: _amount}(params);
//             swapRouterV3.refundETH();
//             // Send the refunded ETH back to sender
//             (bool success, ) = _user.call{value: address(this).balance}("");
//             require(success, "Refund failed");
//         }
//     }

//     //quote how much would cost swap _amountOut of selected token per
//     function quotePrice(
//         bool _isInputSingle,
//         uint256 _amountOut,
//         address _tokenIn,
//         address _tokenOut
//     ) external payable returns (uint256) {
//         uint24 _fee = 500;
//         uint160 sqrtPriceLimitX96 = 0;
//         //We use input single when we have to return the founds given by a contributor in case of the campaign falies
//         if (_isInputSingle) {
//             return
//                 quoter.quoteExactInputSingle(
//                     _tokenIn,
//                     _tokenOut,
//                     _fee,
//                     _amountOut,
//                     sqrtPriceLimitX96
//                 );
//         } else {
//             // we use output single whenever a user wants to make a contribution.
//             return
//                 quoter.quoteExactOutputSingle(
//                     _tokenIn,
//                     _tokenOut,
//                     _fee,
//                     _amountOut,
//                     sqrtPriceLimitX96
//                 );
//         }
//     }
// }

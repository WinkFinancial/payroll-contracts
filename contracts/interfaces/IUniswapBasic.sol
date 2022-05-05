//SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

/**
 * @title UniswapBasic
 * @dev Simpler version of Uniswap v2 and v3 protocol interface
 */
interface IUniswapBasic {
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    function exactOutputSingle(ExactOutputSingleParams calldata params) external payable returns (uint256 amountIn);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract Swap {
    ISwapRouter public swapRouter;

    constructor(address _swapRouter) {
        swapRouter = ISwapRouter(_swapRouter);
    }

    event SwapDone(uint256 amountIn, uint256 amountOut);

    receive() external payable {}

    /// @dev Swaps a fixed amount amount of `_tokenIn` for a maximum possible amount of `_tokenOut`
    /// @param _tokenIn The contract address of the inbound token
    /// @param _tokenOut The contract address of the outbound token
    /// @param _fee The fee tier of the pool
    /// @param _amountIn The exact amount of `_tokenIn` that will be swapped for `_tokenOut`
    /// @param _amountMinOut The minimum allowed amount of `_tokenOut` to receive for a swap
    function swapExactInputSingle(
        address _tokenIn,
        address _tokenOut,
        uint24 _fee,
        uint256 _amountIn,
        uint256 _amountMinOut
    ) external {
        TransferHelper.safeTransferFrom(_tokenIn, msg.sender, address(this), _amountIn);
        TransferHelper.safeApprove(_tokenIn, address(swapRouter), _amountIn);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: _tokenIn,
            tokenOut: _tokenOut,
            fee: _fee,
            recipient: msg.sender,
            deadline: block.timestamp + 120,
            amountIn: _amountIn,
            amountOutMinimum: _amountMinOut,
            sqrtPriceLimitX96: 0
        });
        uint256 amountOut = swapRouter.exactInputSingle(params);
        emit SwapDone(_amountIn, amountOut);
    }

    /// @dev Swaps a minumim possible amount of the `_tokenIn` for a fixed amount of the `_tokenOut`
    /// @param _tokenIn The contract address of the inbound token
    /// @param _tokenOut The contract address of the outbound token
    /// @param _fee The fee tier of the pool
    /// @param _amountOut The exact amount of `_tokenOut` to receive from a swap
    /// @param _amountInMax The maximum allowed amount of `_tokenOut` to spend to receive the specified amount of `_tokenId`
    function swapExactOutputSingle(
        address _tokenIn,
        address _tokenOut,
        uint24 _fee,
        uint256 _amountOut,
        uint256 _amountInMax
    ) external {
        TransferHelper.safeTransferFrom(_tokenIn, msg.sender, address(this), _amountInMax);
        TransferHelper.safeApprove(_tokenIn, address(swapRouter), _amountInMax);
        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter.ExactOutputSingleParams({
            tokenIn: _tokenIn,
            tokenOut: _tokenOut,
            fee: _fee,
            recipient: msg.sender,
            deadline: block.timestamp + 120,
            amountOut: _amountOut,
            amountInMaximum: _amountInMax,
            sqrtPriceLimitX96: 0
        });
        uint256 amountIn = swapRouter.exactOutputSingle(params);
        if (amountIn < _amountInMax) {
            TransferHelper.safeApprove(_tokenIn, address(swapRouter), 0);
            TransferHelper.safeTransfer(_tokenIn, msg.sender, _amountInMax - amountIn);
        }
        emit SwapDone(amountIn, _amountOut);
    }

    /// @dev Swaps a fixed amount of `_tokenIn` for a maximum possible amount of `_tokenOut` through an intermediary pool
    /// @param _tokenIn The contract address of the inbound token
    /// @param _tokenInter The contract address of the intermediary token
    /// @param _tokenOut The contract address of the outbound token
    /// @param _fee1 The fee tier of the pool `_tokenIn/_tokenInter`
    /// @param _fee2 The fee tier of the pool `_tokenInter/_tokenOut`
    /// @param _amountIn The exact amount of `_tokenIn` that will be swapped for `_tokenOut`
    /// @param _amountMinOut The minimum allowed amount of `_tokenOut` to receive for a swap
    function swapExactInputMultihop(
        address _tokenIn,
        address _tokenInter,
        address _tokenOut,
        uint24 _fee1,
        uint24 _fee2,
        uint256 _amountIn,
        uint256 _amountMinOut
    ) external {
        TransferHelper.safeTransferFrom(_tokenIn, msg.sender, address(this), _amountIn);
        TransferHelper.safeApprove(_tokenIn, address(swapRouter), _amountIn);
        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: abi.encodePacked(_tokenIn, _fee1, _tokenInter, _fee2, _tokenOut),
            recipient: msg.sender,
            deadline: block.timestamp + 120,
            amountIn: _amountIn,
            amountOutMinimum: _amountMinOut
        });
        uint256 amountOut = swapRouter.exactInput(params);
        emit SwapDone(_amountIn, amountOut);
    }

    /// @dev Swaps a minimum possible amount of `_tokenIn` for a fixed amount of `_tokenOut` through an intermediary pool
    /// @param _tokenIn The contract address of the inbound token
    /// @param _tokenInter The contract address of the intermediary token
    /// @param _tokenOut The contract address of the outbound token
    /// @param _fee1 The fee tier of the pool `_tokenIn/_tokenInter`
    /// @param _fee2 The fee tier of the pool `_tokenInter/_tokenOut`
    /// @param _amountOut The desired amount of `_tokenOut`
    /// @param _amountInMax The maximum allowed amount of `_tokenIn` to spend to receive the desired amount of `_tokenOut`
    function swapExactOutputMultihop(
        address _tokenIn,
        address _tokenInter,
        address _tokenOut,
        uint24 _fee1,
        uint24 _fee2,
        uint256 _amountOut,
        uint256 _amountInMax
    ) external {
        TransferHelper.safeTransferFrom(_tokenIn, msg.sender, address(this), _amountInMax);
        TransferHelper.safeApprove(_tokenIn, address(swapRouter), _amountInMax);
        ISwapRouter.ExactOutputParams memory params = ISwapRouter.ExactOutputParams({
            path: abi.encodePacked(_tokenOut, _fee2, _tokenInter, _fee1, _tokenIn),
            recipient: msg.sender,
            deadline: block.timestamp + 120,
            amountOut: _amountOut,
            amountInMaximum: _amountInMax
        });
        uint256 amountIn = swapRouter.exactOutput(params);
        if (amountIn < _amountInMax) {
            TransferHelper.safeApprove(_tokenIn, address(swapRouter), 0);
            TransferHelper.safeTransfer(_tokenIn, msg.sender, _amountInMax - amountIn);
        }
        emit SwapDone(amountIn, _amountOut);
    }
}

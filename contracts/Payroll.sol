//SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IERC20Basic.sol";
import "./interfaces/IUniswapBasic.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

/**
 * @title Think and Dev Paymentbox
 * @author Think and Dev Team
 * @notice Swap and transfer multiple ERC20 pairs to multiple accounts in a single transaction.
 * Use any router address of any DEX that uses Uniswap protocol v2 or v3 to make swaps.
 */
contract Payroll is Ownable, Initializable {
    /**
     * Returns the address of the Uniswap protocol router, it could be v2 or v3.
     */
    IUniswapBasic public swapRouter;

    /**
     * Returns if the contract is working with a v2 Uniswap protocol;
     * true means v2, false means v3.
     */
    bool public isSwapV2;

    struct Payment {
        address token;
        uint256 totalAmountToPay;
        address[] receivers;
        uint256[] amountsToTransfer;
    }

    struct Swap {
        address token;
        uint256 amountOut;
        uint256 amountInMax;
        uint24 poolFee;
    }

    event BatchPaymentFinished(address[] _receivers, uint256[] _amountsToTransfer);

    event SwapFinished(address _tokenIn, address _tokenOut, uint256 _amountReceived);

    /**
     * @param _swapRouter Router address to execute swaps.
     * @param _isSwapV2 Boolean to specify the version of the router; true means v2, false means v3.
     */
    function initialize(
        address _swapRouter,
        bool _isSwapV2
    ) public initializer {
        updateSwapRouter(_swapRouter, _isSwapV2);
    }

    /**
     * Set the SwapRouter and the version to be used.
     * @param _swapRouter Router address to execute swaps.
     * @param _isSwapV2 Boolean to specify the version of the router; true means v2, false means v3.
     */
    function setSwapRouter(
        address _swapRouter,
        bool _isSwapV2
    ) public onlyOwner {
        updateSwapRouter(_swapRouter, _isSwapV2);
    }

    function updateSwapRouter(
        address _swapRouter,
        bool _isSwapV2
    ) internal {
        require(_swapRouter != address(0), "Cannot set a 0 address as swapRouter");
        isSwapV2 = _isSwapV2;
        swapRouter = IUniswapBasic(_swapRouter);
    }

    /**
     * Perform the swap and the transfer to the given addresses.
     * @param _erc20TokenOrigin ERC20 token address to swap for another.
     * @param _totalAmountToSpend Total amount of erc20TokenOrigin to spend in swaps.
     * @param _deadline The unix timestamp after a swap will fail.
     * @param _swaps The array of the Swaps data.
     * @param _payments The array of the Payment data.
     * @notice Currently the function only works with ERC20 tokens.
     */
    function performSwapAndPayment(
        address _erc20TokenOrigin,
        uint256 _totalAmountToSpend,
        uint32 _deadline,
        Swap[] calldata _swaps,
        Payment[] calldata _payments
    ) external {
        if (_swaps.length > 0) {
            performSwap(_erc20TokenOrigin, _totalAmountToSpend, _deadline, _swaps);
        }

        performMultiPayment(_payments);
    }

    /**
     * Perform the swap to the given token addresses and amounts.
     * @param _erc20TokenOrigin ERC20 token address to swap for another.
     * @param _totalAmountToSpend Total amount of erc20TokenOrigin to spend in swaps.
     * @param _deadline The unix timestamp after a swap will fail.
     * @param _swaps The array of the Swaps data.
     */
    function performSwap(
        address _erc20TokenOrigin,
        uint256 _totalAmountToSpend,
        uint32 _deadline,
        Swap[] calldata _swaps
    ) internal {
        // transfer the totalAmountToSpend of erc20TokenOrigin from the msg.sender to this contract
        // msg.sender must approve this contract for erc20TokenOrigin
        TransferHelper.safeTransferFrom(_erc20TokenOrigin, msg.sender, address(this), _totalAmountToSpend);

        // approves the swapRouter to spend totalAmountToSpend of erc20TokenOrigin
        TransferHelper.safeApprove(_erc20TokenOrigin, address(swapRouter), _totalAmountToSpend);

        // determines which version of uniswap protocol will be used to perform the swap
        if (isSwapV2) {
            for (uint256 i = 0; i < _swaps.length; i++) {
                swapTokensForExactTokens(
                    _erc20TokenOrigin,
                    _swaps[i].token,
                    _swaps[i].amountOut,
                    _swaps[i].amountInMax,
                    _deadline
                );
            }
        } else {
            for (uint256 i = 0; i < _swaps.length; i++) {
                swapExactOutputSingle(
                    _erc20TokenOrigin,
                    _swaps[i].token,
                    _swaps[i].poolFee,
                    _swaps[i].amountOut,
                    _swaps[i].amountInMax,
                    _deadline
                );
            }
        }

        // return the leftover of _erc20TokenOrigin
        TransferHelper.safeTransfer(
            _erc20TokenOrigin,
            msg.sender,
            IERC20Basic(_erc20TokenOrigin).balanceOf(address(this))
        );
    }

    /**
     * Perform ERC20 tokens swap using UniSwap v2 protocol.
     * @param _tokenIn ERC20 token address to swap for another.
     * @param _tokenOut ERC20 token address to receive.
     * @param _amountOut Exact amount of tokenOut to receive.
     * @param _amountInMax Max amount of tokenIn to pay.
     * @param _deadline The unix timestamp after a swap will fail.
     */
    function swapTokensForExactTokens(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountOut,
        uint256 _amountInMax,
        uint32 _deadline
    ) internal {
        address[] memory path = new address[](2);
        path[0] = _tokenIn;
        path[1] = _tokenOut;

        // return the amount spend of tokenIn
        uint256 amountIn = swapRouter.swapTokensForExactTokens(_amountOut, _amountInMax, path, msg.sender, _deadline)[
            0
        ];

        emit SwapFinished(_tokenIn, _tokenOut, amountIn);
    }

    /**
     * Perform ERC20 tokens swap using UniSwap v3 protocol.
     * @param _tokenIn ERC20 token address to swap for another.
     * @param _tokenOut ERC20 token address to receive.
     * @param _poolFee Pool fee tokenIn/tokenOut.
     * @param _amountOut Exact amount of tokenOut to receive.
     * @param _amountInMax Max amount of tokenIn to pay.
     * @param _deadline The unix timestamp after a swap will fail.
     * @notice Currently the function only works with single pools tokenIn/tokenOut.
     */
    function swapExactOutputSingle(
        address _tokenIn,
        address _tokenOut,
        uint24 _poolFee,
        uint256 _amountOut,
        uint256 _amountInMax,
        uint32 _deadline
    ) internal {
        // return the amount spend of tokenIn
        uint256 amountIn = swapRouter.exactOutputSingle(
            IUniswapBasic.ExactOutputSingleParams({
                tokenIn: _tokenIn,
                tokenOut: _tokenOut,
                fee: _poolFee,
                recipient: msg.sender,
                deadline: _deadline,
                amountOut: _amountOut,
                amountInMaximum: _amountInMax,
                sqrtPriceLimitX96: 0
            })
        );

        emit SwapFinished(_tokenIn, _tokenOut, amountIn);
    }

    /**
     * Perform the payments to the given addresses and amounts.
     * @param _payments The array of the Payment data.
     */
    function performMultiPayment(Payment[] calldata _payments) internal {
        for (uint256 i = 0; i < _payments.length; i++) {
            performPayment(_payments[i].token, _payments[i].receivers, _payments[i].amountsToTransfer);
        }
    }

    /**
     * Performs the payment to the given addresses.
     * @param _erc20TokenAddress The address of the ERC20 token to transfer.
     * @param _receivers The array of payment receivers.
     * @param _amountsToTransfer The array of payments' amounts to perform.
     * The amount will be transfered to the address on _receivers with the same index.
     */
    function performPayment(
        address _erc20TokenAddress,
        address[] calldata _receivers,
        uint256[] calldata _amountsToTransfer
    ) internal {
        require(_amountsToTransfer.length == _receivers.length, "Arrays must have same length");

        for (uint256 i = 0; i < _receivers.length; i++) {
            require(_receivers[i] != address(0), "Cannot send to a 0 address");
            TransferHelper.safeTransferFrom(_erc20TokenAddress, msg.sender, _receivers[i], _amountsToTransfer[i]);
        }
        emit BatchPaymentFinished(_receivers, _amountsToTransfer);
    }
}

//SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IERC20Basic.sol";
import "./interfaces/IUniswapBasic.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

/**
 * @title A contract that allows multiple payments in one transaction
 * @author Lucas Marc
 */
contract Payroll is Ownable, Initializable {
    IUniswapBasic public swapRouter;
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

    function initialize(address _swapRouter, bool _isSwapV2) public initializer {
        isSwapV2 = _isSwapV2;
        swapRouter = IUniswapBasic(_swapRouter);
    }

    /**
     * Set the SwapRouter and the version to be used
     * @param _swapRouter Router address to execute swaps
     */
    function setSwapRouter(address _swapRouter, bool _isSwapV2) public onlyOwner {
        isSwapV2 = _isSwapV2;
        swapRouter = IUniswapBasic(_swapRouter);
    }

    event BatchPaymentFinished(address[] _receivers, uint256[] _amountsToTransfer);

    event SwapFinished(address _tokenIn, address _tokenOut, uint256 _amountReceived);

    /**
     * Perform the swap, the transfer and finally the payment to the given addresses
     * @param _erc20TokenOrigin ERC20 token address to swap for another
     * @param _totalAmountToSpend Total amount of erc20TokenOrigin to spend in swaps and payments.
     * You must know the total amount of erc20TokenOrigin to spend on swaps and also to spend on payments.
     * @param _deadline The unix timestamp after a swap will fail
     * @param _swaps The array of the Swaps data
     * @param _payments The array of the Payment data
     * @notice Currently the function only works with ERC20 tokens
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

        transferFromWallet(_payments);
        performMultiPayment(_payments);

        // returns the leftover of erc20TokenOrigin if it was not used in payments
        returnLeftover(_erc20TokenOrigin);
    }

    /**
     * Transfer the totalAmountToPay minus the current balance of the contract
     * for each token from the msg.sender to this contract
     * msg.sender must approve this contract for each token
     * @param _payments The array of the Payment data
     * @notice Currently the function only works with ERC20 tokens
     */
    function transferFromWallet(Payment[] calldata _payments) internal {
        uint256 currentBalance;
        for (uint256 i = 0; i < _payments.length; i++) {
            currentBalance = IERC20Basic(_payments[i].token).balanceOf(address(this));
            if (_payments[i].totalAmountToPay > currentBalance) {
                TransferHelper.safeTransferFrom(
                    _payments[i].token,
                    msg.sender,
                    address(this),
                    _payments[i].totalAmountToPay - currentBalance
                );
            }
        }
    }

    /**
     * Perform the swap to the given token addresses and amounts
     * @param _erc20TokenOrigin ERC20 token address to swap for another
     * @param _totalAmountToSpend Total amount of erc20TokenOrigin to spend in swaps
     * @param _deadline The unix timestamp after a swap will fail
     * @param _swaps The array of the Swaps data
     * @notice Currently the function only works with ERC20 tokens
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

        // removes the approval to swapRouter
        TransferHelper.safeApprove(_erc20TokenOrigin, address(swapRouter), 0);
    }

    /**
     * Perform ERC20 tokens swap using UniSwap v2 protocol
     * @param _tokenIn ERC20 token address to swap for another
     * @param _tokenOut ERC20 token address to receive
     * @param _amountOut Exact amount of tokenOut to receive
     * @param _amountInMax Max amount of tokenIn to pay
     * @param _deadline The unix timestamp after a swap will fail
     * @notice Currently the function only works with ERC20 tokens
     * @notice Currently the function only works with single pools tokenIn/tokenOut
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
        uint256 amountIn = swapRouter.swapTokensForExactTokens(
            _amountOut,
            _amountInMax,
            path,
            address(this),
            _deadline
        )[0];

        emit SwapFinished(_tokenIn, _tokenOut, amountIn);
    }

    /**
     * Perform ERC20 tokens swap using UniSwap v3 protocol
     * @param _tokenIn ERC20 token address to swap for another
     * @param _tokenOut ERC20 token address to receive
     * @param _poolFee Pool fee tokenIn/tokenOut
     * @param _amountOut Exact amount of tokenOut to receive
     * @param _amountInMax Max amount of tokenIn to pay
     * @param _deadline The unix timestamp after a swap will fail
     * @notice Currently the function only works with ERC20 tokens
     * @notice Currently the function only works with single pools tokenIn/tokenOut
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
                recipient: address(this),
                deadline: _deadline,
                amountOut: _amountOut,
                amountInMaximum: _amountInMax,
                sqrtPriceLimitX96: 0
            })
        );

        emit SwapFinished(_tokenIn, _tokenOut, amountIn);
    }

    /**
     * Perform the payments to the given addresses and amounts
     * @param _payments The array of the Payment data
     */
    function performMultiPayment(Payment[] calldata _payments) internal {
        for (uint256 i = 0; i < _payments.length; i++) {
            performPayment(_payments[i].token, _payments[i].receivers, _payments[i].amountsToTransfer);

            // return the leftover for each token after perform all payments
            returnLeftover(_payments[i].token);
        }
    }

    /**
     * Performs the payment to the given addresses
     * @param _erc20TokenAddress The address of the ERC20 token to transfer
     * @param _receivers The array of payment receivers
     * @param _amountsToTransfer The array of payments' amounts to perform. The amount will be transfered to the address on _receivers with the same index.
     * @notice Currently the function only works with only one ERC20 token
     */
    function performPayment(
        address _erc20TokenAddress,
        address[] calldata _receivers,
        uint256[] calldata _amountsToTransfer
    ) internal {
        require(_amountsToTransfer.length == _receivers.length, "Arrays must have same length");

        for (uint256 i = 0; i < _receivers.length; i++) {
            require(_receivers[i] != address(0), "Cannot send to a 0 address");
            TransferHelper.safeTransfer(_erc20TokenAddress, _receivers[i], _amountsToTransfer[i]);
        }
        emit BatchPaymentFinished(_receivers, _amountsToTransfer);
    }

    /**
     * Return all balance of an ERC20 to the msg.sender
     * @param _erc20TokenAddress The address of the ERC20 token to transfer
     * @notice Currently the function only works with only one ERC20 token
     */
    function returnLeftover(address _erc20TokenAddress) internal {
        uint256 accountBalance = IERC20Basic(_erc20TokenAddress).balanceOf(address(this));

        if (accountBalance > 0) {
            TransferHelper.safeTransfer(_erc20TokenAddress, msg.sender, accountBalance);
        }
    }
}

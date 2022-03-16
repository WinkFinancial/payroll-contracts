//SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

/**
 * @title A contract that allows multiple payments in one transaction
 * @author Lucas Marc
 */
contract Payroll is Initializable, AccessControl {

    bytes32 public constant PAYER_ROLE = keccak256("PAYER_ROLE");
    bytes32 public constant ADMIN_ROLE = 0x00;

    ISwapRouter public swapRouter;

    address public owner;

    struct Payment {
        address token;
        address[] receivers;
        uint256[] amountsToTransfer;
    }

    struct Swap {
        address token;
        uint256 amountOut;
        uint256 amountInMax;
        uint24 poolFee;
    }

    function initialize(address _owner, address _swapRouter) public initializer {
        owner = _owner;
        _setupRole(ADMIN_ROLE, _owner);
        _setupRole(PAYER_ROLE, _owner);
        swapRouter = ISwapRouter(_swapRouter);
    }

    event BatchPaymentFinished(address[] _receivers,
        uint256[] _amountsToTransfer);
    
    event SwapFinished(address _token0, address _token1, uint256 _amountReceived);

    /**
     * Perform the swap and then the payment to the given addresses
     * @param _erc20TokenOrigin ERC20 token address to swap for another
     * @param _swaps The array of the Swaps data
     * @param _payments The array of the Payment data
     * @notice Currently the function only works with ERC20 tokens
     */
    function performSwapAndPayment(address _erc20TokenOrigin, Swap[] calldata _swaps, Payment[] calldata _payments)
        external onlyRole(PAYER_ROLE)
    {
        for (uint256 i = 0; i < _swaps.length; i++) {
            swapExactOutputSingle(
                _erc20TokenOrigin,
                _swaps[i].token,
                _swaps[i].poolFee,
                _swaps[i].amountOut,
                _swaps[i].amountInMax
            );
        }

        for (uint256 i = 0; i < _payments.length; i++) {
            performPayment(
                _payments[i].token,
                _payments[i].receivers,
                _payments[i].amountsToTransfer
            );
        }
    }

    /**
     * Perform ERC20 tokens swap
     * @param _token0 ERC20 token address to swap for another
     * @param _token1 ERC20 token address to receive
     * @param _poolFee PoolFee of the pool token0/token1
     * @param _amountOut Exact amount of token1 to receive
     * @param _amountInMax Max amount of token0 to pay
     * @notice Currently the function only works with ERC20 tokens
     * @notice Currently the function only works with single pools token0/token1
     */
    function swapExactOutputSingle(
        address _token0,
        address _token1,
        uint24 _poolFee,
        uint256 _amountOut,
        uint256 _amountInMax
    ) internal returns (uint256 amountIn) {
        TransferHelper.safeTransferFrom(
            _token0,
            msg.sender,
            address(this),
            _amountInMax
        );

        TransferHelper.safeApprove(_token0, address(swapRouter), _amountInMax);

        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter
            .ExactOutputSingleParams({
                tokenIn: _token0,
                tokenOut: _token1,
                fee: _poolFee,
                recipient: address(this),
                deadline: block.timestamp + 15,
                amountOut: _amountOut,
                amountInMaximum: _amountInMax,
                sqrtPriceLimitX96: 0
            });

        amountIn = swapRouter.exactOutputSingle(params);

        if (amountIn < _amountInMax) {
            TransferHelper.safeApprove(_token0, address(swapRouter), 0);
            TransferHelper.safeTransfer(
                _token0,
                msg.sender,
                _amountInMax - amountIn
            );
        }

        emit SwapFinished(_token0, _token1, amountIn);
    }

    /**
     * Performs the payment to the given addresses
     * @param _erc20TokenAddress The address of the ERC20 token to transfer
     * @param _receivers The array of payment receivers
     * @param _amountsToTransfer The array of payments' amounts to perform. The amount will be transfered to the address on _receivers with the same index.
     * @notice Currently the function only works with only one ERC20 token
     */
    function performPayment(address _erc20TokenAddress,
        address[] calldata _receivers,
        uint256[] calldata _amountsToTransfer)
    public onlyRole(PAYER_ROLE) {
        require(_amountsToTransfer.length == _receivers.length, "Both arrays must have the same length");

        address currentReceiver;
        uint256 currentAmount;

        for (uint256 i = 0; i < _receivers.length; i++) {
            currentReceiver = _receivers[i];
            require(_receivers[i] != address(0), "ERC20: cannot register a 0 address");
            currentAmount = _amountsToTransfer[i];
            TransferHelper.safeTransfer(_erc20TokenAddress, currentReceiver, currentAmount);
        }
        emit BatchPaymentFinished(_receivers, _amountsToTransfer);
    }
}
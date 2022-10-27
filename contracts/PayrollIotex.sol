//SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;
pragma abicoder v2;

import "./interfaces/IMimoV2.sol";
import "./Payroll.sol";

/**
 * @title Think and Dev Paymentbox
 * @author Think and Dev Team
 * @notice Swap and transfer multiple ERC20 pairs to multiple accounts in a single transaction.
 * Use any router address of any DEX that uses Uniswap protocol v2 or v3 to make swaps.
 */
contract PayrollIotex is Payroll {
    using BytesLib for bytes;

    function _swapTokensForExactETH(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) internal override returns (uint256 amounts) {
        return IMimoV2(swapRouter).swapTokensForExactETH(amountOut, amountInMax, path, to, deadline, address(0))[0];
    }

    function _swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) internal override returns (uint256 amounts) {
        return IMimoV2(swapRouter).swapTokensForExactTokens(amountOut, amountInMax, path, to, deadline, address(0))[0];
    }

    function _swapETHForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) internal override returns (uint256 amounts) {
        return
            IMimoV2(swapRouter).swapETHForExactTokens{value: amountInMax}(amountOut, path, to, deadline, address(0))[0];
    }

    function _weth() internal view override returns (address) {
        return IMimoV2(swapRouter).WETH();
    }
}

//SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

/**
 * @title IWETH
 * @dev Simpler version of IWETH interface
 */
interface IWETH {
    function withdraw(uint256 _amount) external;
}

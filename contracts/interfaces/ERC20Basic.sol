//SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 */
interface ERC20Basic {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
}
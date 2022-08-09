//SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;
pragma abicoder v2;

import "./interfaces/IERC20Basic.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

/**
 * @title Think and Dev Faucet
 * @author Think and Dev Team
 * @notice Multiple ERC20 faucet
 */
contract MultiFaucet {

    struct Faucet {
        address owner;
        uint256 amountToGive;
    }

    mapping(address => Faucet) public faucets;

    modifier onlyOwner(address _token) {
        require(msg.sender == faucets[_token].owner, "MultiFaucet: You are not the owner of this faucet");
        _;
    }

    /**
     * Add a new faucet to the faucets mapping.
     * @param _token ERC20 token address.
     * @param _amountToGive amount that the faucet will give.
     */
    function addFaucet(address _token, uint256 _amountToGive) external {
        require(faucets[_token].owner == address(0), "MultiFaucet: This faucet already exist, you can still deposit funds");
        faucets[_token] = Faucet(msg.sender, _amountToGive);
    }

    /**
     * Update the amountToGive to a faucet. Only the faucet owner can perform this action.
     * @param _token ERC20 token address.
     * @param _amountToGive new amount that the faucet will give.
     */
    function updateFaucet(address _token, uint256 _amountToGive) external onlyOwner(_token) {
        faucets[_token].amountToGive = _amountToGive;
    }

    /**
     * Remove a faucet from the faucets mapping. Only the faucet owner can perform this action.
     * @param _token ERC20 token address.
     */
    function removeFaucet(address _token) external onlyOwner(_token) {
        uint256 faucetBalance = IERC20Basic(_token).balanceOf(address(this));
        TransferHelper.safeTransfer(_token, msg.sender, faucetBalance);
        delete faucets[_token];
    }

    /**
     * Gives to the msg.sender the amount of funds specified in amountToGive
     * @param _token ERC20 token address.
     */
    function requestFunds(address _token) external {
        require(faucets[_token].amountToGive != 0, "MultiFaucet: This faucet does not exist");
        uint256 faucetBalance = IERC20Basic(_token).balanceOf(address(this));
        require(faucetBalance >= faucets[_token].amountToGive, "MultiFaucet: This faucet does not have enough funds");
        TransferHelper.safeTransfer(_token, msg.sender, faucets[_token].amountToGive);
    }
}

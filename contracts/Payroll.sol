//SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "hardhat/console.sol";
import "./interfaces/ERC20Basic.sol";

/**
 * @title A contract that allows multiple payments in one transaction
 * @author Lucas Marc
 */
contract Payroll is Initializable {

    modifier onlyOwner {
        require(
            msg.sender == owner,
            "Only owner can call this function."
        );
        _;
    }

    address public owner;

    function initialize(address _owner) public initializer {
        console.log("Deploying a Payroll with owner: ", _owner);
        owner = _owner;
    }

    event BatchPaymentFinished(address[] _receivers, 
                            uint256[] _ammountsToTransfer);
 
    /**
     * Performs the payment to the given addresses
     * @param _erc20TokenAddress The address of the ERC20 token to transfer
     * @param _receivers The array of payment receivers
     * @param _ammountsToTransfer The array of payments' amounts to perform. The amount will be transfered to the address on _receivers with the same index.
     * @notice Currently the function only works with only one ERC20 token
     * @dev TODO: Change onlyOwner to openzeppelin roles.
     * @dev TODO: Extract interface to another file
     */
    function performPayment(address _erc20TokenAddress, 
                            address[] calldata _receivers, 
                            uint256[] calldata _ammountsToTransfer) 
                external onlyOwner {
        console.log("Performing a batch payment");
        require(_ammountsToTransfer.length == _receivers.length, "Both arrays must have the same length");
        
        address currentReceiver;
        uint256 currentAmount;
        ERC20Basic erc20token = ERC20Basic(_erc20TokenAddress);

        for (uint256 i = 0; i < _receivers.length; i++) {
            currentReceiver = _receivers[i];
            console.log("Paying to: ", currentReceiver);
            require(_receivers[i] != address(0), "ERC20: cannot register a 0 address");
            
            currentAmount = _ammountsToTransfer[i];
            console.log("Amount: ", currentAmount);

            erc20token.transferFrom(msg.sender, currentReceiver, currentAmount);
        }
        console.log("Finished batch payment");
        emit BatchPaymentFinished(_receivers, _ammountsToTransfer);
    }
}
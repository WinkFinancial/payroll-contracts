//SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "hardhat/console.sol";

contract Payroll is Initializable {

    modifier onlyOwner {
        require(
            msg.sender == owner,
            "Only owner can call this function."
        );
        _;
    }

    //Map of address and amounts to transfer
    mapping (address=>uint256) private ammountsToTransfer;

    address[] private receivers;

    address public owner;

    uint256 private totalAmount;

    constructor() {
        owner = msg.sender;
    }

    function initialize(address _owner) public initializer {
        console.log("Deploying a Payroll with owner:", _owner);
        owner = _owner;
    }

    event Received(address, uint);

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
 
    //TODO: change to a transfer with a list of accounts
    function registerAmmount(address _address, uint256 _ammount) public onlyOwner{
        require(_address != address(0), "ERC20: cannot register a 0 address");
        if(ammountsToTransfer[_address] != 0){
            totalAmount -= ammountsToTransfer[_address];
        }
        ammountsToTransfer[_address] = _ammount;
        receivers.push(_address);
        totalAmount += ammountsToTransfer[_address];
    }
}
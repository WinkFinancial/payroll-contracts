//SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";

contract Payroll is Initializable, AccessControl {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    //Map of address and amounts to transfer
    mapping(address => mapping(uint256 => uint256)) private invoices;
    mapping(address => mapping(uint256 => bool)) private payouts;

    address private token;

    address public owner;

    mapping(address => uint256) balances;

    uint256 private totalBalance;

    uint256 private totalPayout;

    constructor() {
        owner = msg.sender;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function initialize(address _owner) public initializer {
        console.log("Deploying a Payroll with owner:", _owner);
        owner = _owner;
    }

    event Received(address, uint);

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function setToken(address _address) public onlyRole(DEFAULT_ADMIN_ROLE) {
        token = _address;
    }

    function approveInvoice(uint256 _amount) public onlyRole(ADMIN_ROLE) {
        // add the deposited tokens into existing balance
        balances[msg.sender] += _amount;
        totalBalance += _amount;
        // transfer the tokens from the sender to this contract
        IERC20(token).approve(address(this), _amount);
    }

    function getUserInvoice(address _address, uint256 invoice) public view onlyRole(ADMIN_ROLE) returns (uint256, bool){
        return (invoices[_address][invoice], payouts[_address][invoice]);
    }

    function getInvoice(uint256 invoice) public view returns (uint256, bool){
        return (invoices[msg.sender][invoice], payouts[msg.sender][invoice]);
    }

    function registerInvoice(address _address, uint256 invoice, uint256 _amount) public onlyRole(ADMIN_ROLE) {
        require(_address != address(0), "ERC20: cannot register a 0 address");
        require(_amount <= balances[msg.sender]);
        invoices[_address][invoice] = _amount;
        payouts[_address][invoice] = true;
        balances[msg.sender] -= _amount;
        IERC20(token).transfer(_address, _amount);
        totalBalance -= _amount;
        totalPayout += _amount;
    }
}
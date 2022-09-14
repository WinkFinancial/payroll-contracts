// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Token is ERC20, AccessControl {
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant MINTER = keccak256("MINTER");
    bytes32 public constant BURNER = keccak256("BURNER");

    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        _mint(msg.sender, 1000000000000 * (10**uint256(decimals())));
        _setupRole(ADMIN, msg.sender);
        _setRoleAdmin(MINTER, ADMIN);
        _setRoleAdmin(BURNER, ADMIN);
    }

    function mint(address _to, uint256 _value) public onlyRole(MINTER) {
        _mint(_to, _value);
    }

    function burn(address _from, uint256 _value) public onlyRole(BURNER) {
        _burn(_from, _value);
    }
}

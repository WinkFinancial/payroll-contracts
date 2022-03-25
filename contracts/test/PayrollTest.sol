//SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;
pragma abicoder v2;

import "../Payroll.sol";

/**
 * @title A contract that allows multiple payments in one transaction
 * @author Lucas Marc
 */
contract PayrollTest is Payroll {
    constructor(address _owner, address _swapRouter) {
        owner = _owner;
        swapRouter = ISwapRouter(_swapRouter);
        _setupRole(ADMIN_ROLE, _owner);
        _setupRole(PAYER_ROLE, _owner);
    }
}

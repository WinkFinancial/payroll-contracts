import {assert, expect} from 'chai';
import {deployments, ethers, getNamedAccounts} from 'hardhat';

import { Payroll } from '../typechain-types/Payroll'

describe('Payroll', async function () {
  let deployer: string;

  let payrollContract: Payroll;

  beforeEach(async function () {

    let namedAccounts = await getNamedAccounts();

    deployer = namedAccounts.deployer;

    await deployments.fixture();

    payrollContract = await ethers.getContract<Payroll>('Payroll');
  });

  it("Should return the deployer as owner", async function () {

    const owner = await payrollContract.owner();

    expect(owner).to.equal(deployer);
  });

  it("Should perform 1 payment", async function () {
    assert.fail("Not implemented yet");
  });

  it("Should perform multiple payment", async function () {
    assert.fail("Not implemented yet");
  });

  it("Should fail if not enough balance of token", async function () {
    assert.fail("Not implemented yet");
  });

  it("Should fail if any address is 0", async function () {
    assert.fail("Not implemented yet");
  });
});
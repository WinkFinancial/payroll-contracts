import {expect} from 'chai';
import {deployments, ethers, getNamedAccounts} from 'hardhat';

import { Payroll } from '../typechain-types/Payroll'

describe('Payroll', async function () {
  let deployer: string;

  beforeEach(async function () {

    let namedAccounts = await getNamedAccounts();

    deployer = namedAccounts.deployer;

    await deployments.fixture();
  });

  it("Should return the deployer as owner", async function () {

    const payroll = await ethers.getContract<Payroll>('Payroll');

    const owner = await payroll.owner();

    expect(owner).to.equal(deployer);
  });
});
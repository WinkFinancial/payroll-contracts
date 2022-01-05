import {expect} from 'chai';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
const Web3 = require('web3');
const web3 = new Web3();

import { Payroll } from '../typechain-types/Payroll'

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

const ADMIN = web3.utils.soliditySha3('ADMIN_ROLE');

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

  /*it('deployer has default admin role', async function () {
    const payroll = await ethers.getContract<Payroll>('Payroll');
    expect(await payroll.hasRole(DEFAULT_ADMIN_ROLE, deployer)).to.equal(true);
  });*/

  it('other roles\'s admin is the default admin role', async function () {
    const payroll = await ethers.getContract<Payroll>('Payroll');
    expect(await payroll.getRoleAdmin(ADMIN)).to.equal(DEFAULT_ADMIN_ROLE);
  });


});
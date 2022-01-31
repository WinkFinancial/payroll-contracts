import { expect} from 'chai';
import { deployments, ethers, getNamedAccounts } from 'hardhat';

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
    const [owner, addr1] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const hardhatToken = await Token.deploy("BNB", "BNB", ethers.BigNumber.from('1000'), owner.address);

    await hardhatToken.approve(payrollContract.address, ethers.BigNumber.from('1000'));
    await payrollContract.performPayment(hardhatToken.address, [addr1.address], [ethers.BigNumber.from('50')]);

    expect(await hardhatToken.balanceOf(addr1.address)).to.equal(50);
    expect(await hardhatToken.balanceOf(owner.address)).to.equal(950);
  });

  it("Should perform multiple payment", async function () {
    const [owner, add1, add2, add3, add4] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const hardhatToken = await Token.deploy("BNB", "BNB", ethers.BigNumber.from('1000'), owner.address);

    await hardhatToken.approve(payrollContract.address, ethers.BigNumber.from('1000'));
    await payrollContract.performPayment(hardhatToken.address, [add1.address, add2.address, add3.address, add4.address], [ethers.BigNumber.from('50'), ethers.BigNumber.from('100'), ethers.BigNumber.from('150'), ethers.BigNumber.from('200')]);

    expect(await hardhatToken.balanceOf(add1.address)).to.equal(50);
    expect(await hardhatToken.balanceOf(add2.address)).to.equal(100);
    expect(await hardhatToken.balanceOf(add3.address)).to.equal(150);
    expect(await hardhatToken.balanceOf(add4.address)).to.equal(200);
    expect(await hardhatToken.balanceOf(owner.address)).to.equal(500);
  });

  it("Should fail if not enough balance of token", async function () {
    const [owner, add1] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const hardhatToken = await Token.deploy("BNB", "BNB", ethers.BigNumber.from('10'), owner.address);

    await hardhatToken.approve(payrollContract.address, ethers.BigNumber.from('10'));
    const transactionWithExceededBalance = payrollContract.performPayment(hardhatToken.address, [add1.address], [ethers.BigNumber.from('500')])

    await expect(transactionWithExceededBalance)
      .to.be.revertedWith('ERC20: transfer amount exceeds balance');
  });

  it("Should fail if any address is 0", async function () {
    const [owner, add1] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const hardhatToken = await Token.deploy("BNB", "BNB", ethers.BigNumber.from('10'), owner.address);

    await hardhatToken.approve(payrollContract.address, ethers.BigNumber.from('10'));
    const callWithAddress0 = payrollContract.performPayment(hardhatToken.address, [add1.address, ethers.constants.AddressZero], [ethers.BigNumber.from('5'), ethers.BigNumber.from('5')]);

    await expect(callWithAddress0)
      .to.be.revertedWith('ERC20: cannot register a 0 address');
  });

  it("Should fail if recipients and amounts list are not the same length", async () => {
    const [owner, add1, add2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const hardhatToken = await Token.deploy("BNB", "BNB", ethers.BigNumber.from('100'), owner.address);

    await hardhatToken.approve(payrollContract.address, ethers.BigNumber.from('100'));
    const callWithDifferentArrayLength = payrollContract.performPayment(hardhatToken.address, [add1.address, add2.address], [ethers.BigNumber.from('5'), ethers.BigNumber.from('50'), ethers.BigNumber.from('25')]);

    await expect(callWithDifferentArrayLength)
      .to.be.revertedWith("Both arrays must have the same length");
  });
});
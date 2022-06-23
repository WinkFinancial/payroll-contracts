import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {expect} from 'chai';
import {Contract, FixedNumber} from 'ethers';
import {deploy, DeployResult} from './helpers/uniswap';

import {Token, Payroll} from '../typechain-types';
import {PaymentStruct} from '../typechain-types/Payroll';
import {network} from 'hardhat';

let uniswapV2Router02: Contract;
let tokenA: Token;
let tokenB: Token;
let tokenC: Token;
let payroll: Payroll;
let admin: SignerWithAddress;
let payer: SignerWithAddress;
let userA: SignerWithAddress;
let userB: SignerWithAddress;
let feeAddress: SignerWithAddress;
let deadline = 0;

describe('Contract: Payroll', () => {
  beforeEach(async () => {
    await network.provider.request({
      method: 'hardhat_reset',
    });
    [admin, payer, userA, userB, feeAddress] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    tokenA = (await Token.deploy('Token_A', 'TKA')) as Token;
    tokenB = (await Token.deploy('Token_B', 'TKB')) as Token;
    tokenC = (await Token.deploy('Token_C', 'TKC')) as Token;

    if (Number(tokenA.address) > Number(tokenB.address)) {
      const tmp = tokenB;
      tokenB = tokenA;
      tokenA = tmp;
    }

    if (Number(tokenB.address) > Number(tokenC.address)) {
      const tmp = tokenC;
      tokenC = tokenB;
      tokenB = tmp;
    }

    const deployResult: DeployResult = await deploy({owner: admin});
    uniswapV2Router02 = deployResult.uniswapV2Router02;

    const Payroll = await ethers.getContractFactory('Payroll');
    payroll = (await Payroll.deploy()) as Payroll;
    await payroll.initialize(uniswapV2Router02.address, true, feeAddress.address, 0);

    await tokenB.transfer(payer.address, 1000000);

    const timestamp = Date.now() + 1000 * 60 * 60;
    deadline = Math.floor(timestamp / 1000);
  });

  describe('SwapRouter', () => {
    it('should update swapRouter', async () => {
      const newRouter = ethers.Wallet.createRandom();
      await payroll.setSwapRouter(newRouter.address, true);
      expect(await payroll.isSwapV2()).to.be.true;
    });

    it('should not update swapRouter with a zero address', async () => {
      await expect(payroll.setSwapRouter(ethers.constants.AddressZero, true)).to.be.revertedWith(
        'Payroll: Cannot set a 0 address as swapRouter'
      );
    });

    it('should not initialize swapRouter with a zero address', async () => {
      const PayrollTest = await ethers.getContractFactory('Payroll');
      const payrollTest: Payroll = (await PayrollTest.deploy()) as Payroll;
      await expect(
        payrollTest.initialize(ethers.constants.AddressZero, false, feeAddress.address, 0)
      ).to.be.revertedWith('Payroll: Cannot set a 0 address as swapRouter');
    });
  });

  describe('Fees', () => {
    it('Should set feeAddress', async () => {
      await payroll.setFeeAddress(userA.address);
      expect(await payroll.feeAddress()).to.be.equal(userA.address);
    });

    it('should not set feeAddress with a zero address', async () => {
      await expect(payroll.setFeeAddress(ethers.constants.AddressZero)).to.be.revertedWith(
        `Payroll: Fee address can't be 0`
      );
    });

    it('Only owner can set feeAddress', async () => {
      await expect(payroll.connect(userA).setFeeAddress(userA.address)).to.be.revertedWith(
        `Ownable: caller is not the owner`
      );
    });

    it('Should set fee', async () => {
      const fee = ethers.utils.parseUnits('0.01', 'ether');
      await payroll.setFee(fee);
      expect(await payroll.fee()).to.be.equal(fee);
    });

    it('should not set fee bigger or equal to 3%', async () => {
      const fee = ethers.utils.parseUnits('0.03', 'ether');
      await expect(payroll.setFee(fee)).to.be.revertedWith(`Payroll: Fee should be less than 3%`);
    });

    it('Only owner can set fee', async () => {
      await expect(payroll.connect(userA).setFee(0)).to.be.revertedWith(`Ownable: caller is not the owner`);
    });
  });

  describe('performMultiPayment', () => {
    beforeEach(async () => {
      await tokenB.connect(payer).approve(payroll.address, 1000000);
      await tokenA.connect(payer).approve(payroll.address, 1000000);
      await tokenC.connect(payer).approve(payroll.address, 1000000);
      await payroll.approveTokens([tokenA.address, tokenB.address, tokenC.address]);
    });

    it('should performMultiPayment transfer', async () => {
      const payments: PaymentStruct[] = [
        {
          token: tokenB.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50],
        },
      ];

      await payroll.connect(payer).performMultiPayment(payments);

      expect(await tokenB.balanceOf(userA.address)).to.equal(50);
      expect(await tokenB.balanceOf(userB.address)).to.equal(50);
    });

    it('should revert if empty amounts', async () => {
      const payments: PaymentStruct[] = [
        {
          token: tokenB.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [],
        },
      ];

      await expect(payroll.connect(payer).performMultiPayment(payments)).to.be.revertedWith(
        'Payroll: No amounts to transfer'
      );
    });

    it('should revert because amountsToTransfers and receivers length', async () => {
      const payments: PaymentStruct[] = [
        {
          token: tokenB.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50, 50],
        },
      ];

      await expect(payroll.connect(payer).performMultiPayment(payments)).to.be.revertedWith(
        'Payroll: Arrays must have same length'
      );
    });

    it('should revert because one receiver is a zero address', async () => {
      const payments: PaymentStruct[] = [
        {
          token: tokenB.address,
          receivers: [userA.address, ethers.constants.AddressZero],
          amountsToTransfer: [50, 50],
        },
      ];

      await expect(payroll.connect(payer).performMultiPayment(payments)).to.be.revertedWith(
        'Payroll: Cannot send to a 0 address'
      );
    });

    it('should transfer ETH and ERC20', async () => {
      const previousUserABalanceETH = await ethers.provider.getBalance(userA.address);
      const previousUserBBalanceETH = await ethers.provider.getBalance(userB.address);
      const previousPayerBalanceETH = await ethers.provider.getBalance(payer.address);
      const previousBalanceTokenB = await tokenB.balanceOf(payer.address);

      const ethAmountToReceive = ethers.utils.parseEther('50.0');
      const ethAmountToPay = ethers.utils.parseEther('150.0');

      const payments: PaymentStruct[] = [
        {
          token: ethers.constants.AddressZero,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [ethAmountToReceive, ethAmountToReceive],
        },
        {
          token: tokenB.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50],
        },
      ];

      await payroll.connect(payer).performMultiPayment(payments, {value: ethAmountToPay});

      const newBalanceTokenB = await tokenB.balanceOf(payer.address);

      expect(await tokenB.balanceOf(userA.address)).to.equal(50);
      expect(await tokenB.balanceOf(userB.address)).to.equal(50);
      expect(previousBalanceTokenB.sub(newBalanceTokenB)).to.be.equal(100);

      expect(await ethers.provider.getBalance(userA.address)).to.equal(previousUserABalanceETH.add(ethAmountToReceive));
      expect(await ethers.provider.getBalance(userB.address)).to.equal(previousUserBBalanceETH.add(ethAmountToReceive));

      // sent 150 to contract, expect leftover was returned
      const payerETHFixedBalance = FixedNumber.fromValue(await ethers.provider.getBalance(payer.address), 18).round();
      const previousPayerETHFixedBalance = FixedNumber.fromValue(previousPayerBalanceETH, 18).round();
      expect(previousPayerETHFixedBalance.subUnsafe(FixedNumber.fromString('100.0')).toString()).to.equal(
        payerETHFixedBalance.toString()
      );
    });

    it('should transfer ETH using performSwapV2AndPayment', async () => {
      const previousUserABalanceETH = await ethers.provider.getBalance(userA.address);
      const previousUserBBalanceETH = await ethers.provider.getBalance(userB.address);
      const previousPayerBalanceETH = await ethers.provider.getBalance(payer.address);

      const ethAmountToReceive = ethers.utils.parseEther('50.0');
      const ethAmountToPay = ethers.utils.parseEther('150.0');

      const payments: PaymentStruct[] = [
        {
          token: ethers.constants.AddressZero,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [ethAmountToReceive, ethAmountToReceive],
        },
      ];

      await payroll
        .connect(payer)
        .performSwapV2AndPayment(ethers.constants.AddressZero, 0, deadline, [], payments, {value: ethAmountToPay});

      expect(await ethers.provider.getBalance(userA.address)).to.equal(previousUserABalanceETH.add(ethAmountToReceive));
      expect(await ethers.provider.getBalance(userB.address)).to.equal(previousUserBBalanceETH.add(ethAmountToReceive));

      // sent 150 to contract, expect leftover was returned
      const payerETHFixedBalance = FixedNumber.fromValue(await ethers.provider.getBalance(payer.address), 18).round();
      const previousPayerETHFixedBalance = FixedNumber.fromValue(previousPayerBalanceETH, 18).round();
      expect(previousPayerETHFixedBalance.subUnsafe(FixedNumber.fromString('100.0')).toString()).to.equal(
        payerETHFixedBalance.toString()
      );
    });

    it('should revert for not sending enough ETH', async () => {
      const ethAmountToReceive = ethers.utils.parseEther('50.0');
      const ethAmountToPay = ethers.utils.parseEther('10.0');

      const payments: PaymentStruct[] = [
        {
          token: ethers.constants.AddressZero,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [ethAmountToReceive, ethAmountToReceive],
        },
      ];

      await expect(payroll.connect(payer).performMultiPayment(payments, {value: ethAmountToPay})).to.be.revertedWith(
        'Payroll: ETH transfer failed'
      );
    });

    it('should revert for not paying the fee in ETH', async () => {
      const ethAmountToReceive = ethers.utils.parseEther('50.0');
      const ethAmountToPay = ethers.utils.parseEther('100.0');

      const fee = ethers.utils.parseUnits('0.01', 'ether');
      await payroll.setFee(fee);

      const payments: PaymentStruct[] = [
        {
          token: ethers.constants.AddressZero,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [ethAmountToReceive, ethAmountToReceive],
        },
      ];

      await expect(payroll.connect(payer).performMultiPayment(payments, {value: ethAmountToPay})).to.be.revertedWith(
        'Payroll: ETH fee transfer failed'
      );
    });
  });
});

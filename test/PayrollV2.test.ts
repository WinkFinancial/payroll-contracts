import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {expect} from 'chai';
import {Contract, BigNumber} from 'ethers';
import {deploy, createPair, addLiquidity, DeployResult} from './helpers/uniswap';

import {Token, Payroll} from '../typechain-types';
import {PaymentStruct, SwapStruct} from '../typechain-types/Payroll';

let uniswapV2Router02: Contract;
let tokenA: Token;
let tokenB: Token;
let tokenC: Token;
let payroll: Payroll;
let admin: SignerWithAddress;
let payer: SignerWithAddress;
let userA: SignerWithAddress;
let userB: SignerWithAddress;

describe('Contract: Payroll V2', () => {
  before(async () => {
    [admin, payer, userA, userB] = await ethers.getSigners();

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
    await payroll.initialize(uniswapV2Router02.address, tokenB.address, true);

    await createPair(tokenA.address, tokenB.address);
    await createPair(tokenC.address, tokenB.address);

    await tokenA.approve(uniswapV2Router02.address, 10000000000000);
    await tokenB.approve(uniswapV2Router02.address, 10000000000000);
    await tokenC.approve(uniswapV2Router02.address, 10000000000000);

    await addLiquidity({
      owner: admin,
      token0: tokenA,
      amountA: BigNumber.from('1000000000000'),
      token1: tokenB,
      amountB: BigNumber.from('1000000000000'),
    });

    await addLiquidity({
      owner: admin,
      token0: tokenC,
      amountA: BigNumber.from('1000000000000'),
      token1: tokenB,
      amountB: BigNumber.from('1000000000000'),
    });
  });

  describe('Payroll', () => {
    let deadline = 0;

    beforeEach(async () => {
      await tokenB.transfer(payer.address, 1000000);
      await tokenB.connect(payer).approve(payroll.address, 1000000);

      await tokenA.transfer(payer.address, 1000000);
      await tokenA.connect(payer).approve(payroll.address, 1000000);

      await tokenC.transfer(payer.address, 1000000);
      await tokenC.connect(payer).approve(payroll.address, 1000000);

      const timestamp = Date.now() + 1000 * 60 * 60;
      deadline = Math.floor(timestamp / 1000);
    });

    it('should swap and transfer', async () => {
      const swaps: SwapStruct[] = [
        {token: tokenA.address, amountOut: 100, amountInMax: 150, poolFee: '3000'},
        {token: tokenC.address, amountOut: 100, amountInMax: 150, poolFee: '3000'},
      ];

      const payments: PaymentStruct[] = [
        {
          token: tokenA.address,
          totalAmountToPay: 200,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [100, 100],
        },
        {
          token: tokenB.address,
          totalAmountToPay: 200,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [100, 100],
        },
        {
          token: tokenC.address,
          totalAmountToPay: 200,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [100, 100],
        },
      ];

      await payroll.connect(payer).performSwapAndPayment(tokenB.address, 1000, deadline, swaps, payments);

      expect(await tokenA.balanceOf(userA.address)).to.equal(100);
      expect(await tokenA.balanceOf(userB.address)).to.equal(100);

      expect(await tokenB.balanceOf(userA.address)).to.equal(100);
      expect(await tokenB.balanceOf(userB.address)).to.equal(100);

      expect(await tokenC.balanceOf(userA.address)).to.equal(100);
      expect(await tokenC.balanceOf(userB.address)).to.equal(100);
    });

    it('should only swap', async () => {
      const swaps: SwapStruct[] = [
        {token: tokenA.address, amountOut: 100, amountInMax: 150, poolFee: '3000'},
        {token: tokenC.address, amountOut: 100, amountInMax: 150, poolFee: '3000'},
      ];

      expect(await tokenA.balanceOf(payer.address)).to.equal(1999900);
      expect(await tokenC.balanceOf(payer.address)).to.equal(1999900);

      await payroll.connect(payer).performSwapAndPayment(tokenB.address, 1000, deadline, swaps, []);

      expect(await tokenA.balanceOf(payer.address)).to.equal(2000000);
      expect(await tokenC.balanceOf(payer.address)).to.equal(2000000);
    });

    it('should only transfer', async () => {
      const payments: PaymentStruct[] = [
        {
          token: tokenB.address,
          totalAmountToPay: 100,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50],
        },
      ];

      await payroll.connect(payer).performSwapAndPayment(tokenB.address, 1000, deadline, [], payments);

      expect(await tokenB.balanceOf(userA.address)).to.equal(150);
      expect(await tokenB.balanceOf(userB.address)).to.equal(150);
    });
  });
});

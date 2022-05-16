import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {expect} from 'chai';
import {Contract, BigNumber} from 'ethers';
import {deploy, createPair, addLiquidity, DeployResult} from './helpers/uniswap';

import {Token, Payroll} from '../typechain-types';
import {PaymentStruct, SwapStruct} from '../typechain-types/Payroll';
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
const poolFee = '3000';

describe('Contract: Payroll UniV2', () => {
  beforeEach(async () => {
    await network.provider.request({
      method: "hardhat_reset"
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

    await tokenB.transfer(payer.address, 1000000);

    const timestamp = Date.now() + 1000 * 60 * 60;
    deadline = Math.floor(timestamp / 1000);
  });

  describe('Tokens Approved', () => {
    beforeEach(async () => {
      await tokenB.connect(payer).approve(payroll.address, 1000000);
      await tokenA.connect(payer).approve(payroll.address, 1000000);
      await tokenC.connect(payer).approve(payroll.address, 1000000);
      await payroll.approveTokens([tokenA.address, tokenB.address, tokenC.address])
    })

    it('should swap and transfer', async () => {
      const swaps: SwapStruct[] = [
        {token: tokenA.address, amountOut: 200, amountInMax: 250, poolFee: poolFee},
        {token: tokenC.address, amountOut: 200, amountInMax: 250, poolFee: poolFee},
      ];

      const previousBalanceTokenB = await tokenB.balanceOf(payer.address)

      const payments: PaymentStruct[] = [
        {
          token: tokenA.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [100, 100],
        },
        {
          token: tokenB.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [100, 100],
        },
        {
          token: tokenC.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [100, 100],
        },
      ];

      await payroll.connect(payer).performSwapAndPayment(tokenB.address, 1000, deadline, swaps, payments);

      const newBalanceTokenB = await tokenB.balanceOf(payer.address)

      expect(await tokenA.balanceOf(userA.address)).to.equal(100);
      expect(await tokenA.balanceOf(userB.address)).to.equal(100);

      expect(await tokenB.balanceOf(userA.address)).to.equal(100);
      expect(await tokenB.balanceOf(userB.address)).to.equal(100);

      expect(await tokenC.balanceOf(userA.address)).to.equal(100);
      expect(await tokenC.balanceOf(userB.address)).to.equal(100);

      expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.closeTo(600,2)
    });

    it('should only swap', async () => {
      const swaps: SwapStruct[] = [
        {token: tokenA.address, amountOut: 100, amountInMax: 150, poolFee: poolFee},
        {token: tokenC.address, amountOut: 100, amountInMax: 150, poolFee: poolFee},
      ];

      const previousBalanceTokenA = await tokenA.balanceOf(payer.address)
      const previousBalanceTokenC = await tokenC.balanceOf(payer.address)
      const previousBalanceTokenB = await tokenB.balanceOf(payer.address)

      await payroll.connect(payer).performSwapAndPayment(tokenB.address, 300, deadline, swaps, [])

      const newBalanceTokenA = await tokenA.balanceOf(payer.address)
      const newBalanceTokenC = await tokenC.balanceOf(payer.address)
      const newBalanceTokenB = await tokenB.balanceOf(payer.address)

      expect(newBalanceTokenA.sub(previousBalanceTokenA)).to.equal(100)
      expect(newBalanceTokenC.sub(previousBalanceTokenC)).to.equal(100)
      expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.closeTo(200, 2)
    });

    it('should only transfer', async () => {
      const previousBalanceTokenB = await tokenB.balanceOf(payer.address)
      const payments: PaymentStruct[] = [
        {
          token: tokenB.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50],
        },
      ];

      await payroll.connect(payer).performSwapAndPayment(tokenB.address, 100, deadline, [], payments)

      const newBalanceTokenB = await tokenB.balanceOf(payer.address)

      expect(await tokenB.balanceOf(userA.address)).to.equal(50)
      expect(await tokenB.balanceOf(userB.address)).to.equal(50)
      expect(previousBalanceTokenB.sub(newBalanceTokenB)).to.be.equal(100)
    });

    describe('Payroll required', () => {

      it('should revert because amountInMax lower than expected to trade for amountOut', async () => {
        const swaps: SwapStruct[] = [
          {token: tokenA.address, amountOut: 200, amountInMax: 100, poolFee: poolFee},
        ];

        await expect(
          payroll.connect(payer).performSwapAndPayment(tokenB.address, 500, deadline, swaps, [])
        ).to.be.revertedWith('UniswapV2Router: EXCESSIVE_INPUT_AMOUNT');
      });

      it('should revert because token does not exists', async () => {
        const swaps: SwapStruct[] = [
          {token: ethers.constants.AddressZero, amountOut: 200, amountInMax: 250, poolFee: poolFee},
        ];

        await expect(
          payroll.connect(payer).performSwapAndPayment(tokenB.address, 1000, deadline, swaps, [])
        ).to.be.reverted;
      });

      it('should revert because amountOut 0', async () => {
        const swaps: SwapStruct[] = [
          {token: tokenA.address, amountOut: 0, amountInMax: 250, poolFee: poolFee},
        ];

        await expect(
          payroll.connect(payer).performSwapAndPayment(tokenB.address, 1000, deadline, swaps, [])
        ).to.be.reverted;
      });

      it('should revert because amountOut 0', async () => {
        const swaps: SwapStruct[] = [
          {token: tokenA.address, amountOut: 0, amountInMax: 250, poolFee: poolFee},
        ];

        await expect(
          payroll.connect(payer).performSwapAndPayment(tokenB.address, 1000, deadline, swaps, [])
        ).to.be.revertedWith('UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT');
      });

      it('should revert because of old deadline', async () => {
        const swaps: SwapStruct[] = [
          {token: tokenA.address, amountOut: 200, amountInMax: 250, poolFee: poolFee},
        ];

        await expect(
          payroll.connect(payer).performSwapAndPayment(tokenB.address, 1000, Math.floor(Date.now()/1000)-1, swaps, [])
        ).to.be.revertedWith('UniswapV2Router: EXPIRED');
      });

    });

    describe('With 1% fees', () => {
      beforeEach(async () => {
        const fee  = ethers.utils.parseUnits('0.01', 'ether');
        await payroll.setFee(fee)
      })

      it('should swap and transfer with fees activated', async () => {
        const swaps: SwapStruct[] = [
          // Add 1% fee to amountOut
          {token: tokenA.address, amountOut: 202, amountInMax: 250, poolFee: poolFee},
          {token: tokenC.address, amountOut: 202, amountInMax: 250, poolFee: poolFee},
        ];

        const previousBalanceTokenB = await tokenB.balanceOf(payer.address)

        const payments: PaymentStruct[] = [
          {
            token: tokenA.address,
            receivers: [userA.address, userB.address],
            amountsToTransfer: [100, 100], // 202 when adding 1% fee
          },
          {
            token: tokenB.address,
            receivers: [userA.address, userB.address],
            amountsToTransfer: [100, 100], // 202 when adding 1% fee
          },
          {
            token: tokenC.address,
            receivers: [userA.address, userB.address],
            amountsToTransfer: [100, 100], // 202 when adding 1% fee
          },
        ];

        await payroll.connect(payer).performSwapAndPayment(tokenB.address, 500, deadline, swaps, payments);

        const newBalanceTokenB = await tokenB.balanceOf(payer.address)
        const feeBalanceTokenA = await tokenA.balanceOf(feeAddress.address)
        const feeBalanceTokenB = await tokenB.balanceOf(feeAddress.address)
        const feeBalanceTokenC = await tokenC.balanceOf(feeAddress.address)

        expect(await tokenA.balanceOf(userA.address)).to.equal(100);
        expect(await tokenA.balanceOf(userB.address)).to.equal(100);

        expect(await tokenB.balanceOf(userA.address)).to.equal(100);
        expect(await tokenB.balanceOf(userB.address)).to.equal(100);

        expect(await tokenC.balanceOf(userA.address)).to.equal(100);
        expect(await tokenC.balanceOf(userB.address)).to.equal(100);

        expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.closeTo(606, 2) // Tokens used for swap

        expect(feeBalanceTokenA).to.be.equal(2)
        expect(feeBalanceTokenB).to.be.equal(2)
        expect(feeBalanceTokenC).to.be.equal(2)
      });

      it('should only swap  with fees activated', async () => {
        const swaps: SwapStruct[] = [
          {token: tokenA.address, amountOut: 100, amountInMax: 150, poolFee: poolFee},
          {token: tokenC.address, amountOut: 100, amountInMax: 150, poolFee: poolFee},
        ];

        const previousBalanceTokenA = await tokenA.balanceOf(payer.address)
        const previousBalanceTokenC = await tokenC.balanceOf(payer.address)
        const previousBalanceTokenB = await tokenB.balanceOf(payer.address)

        await payroll.connect(payer).performSwapAndPayment(tokenB.address, 1000, deadline, swaps, [])

        const newBalanceTokenA = await tokenA.balanceOf(payer.address)
        const newBalanceTokenC = await tokenC.balanceOf(payer.address)
        const newBalanceTokenB = await tokenB.balanceOf(payer.address)

        expect(newBalanceTokenA.sub(previousBalanceTokenA)).to.equal(100)
        expect(newBalanceTokenC.sub(previousBalanceTokenC)).to.equal(100)
        expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.closeTo(200, 2)
      });

      it('should only transfer with fees activated', async () => {
        const previousBalanceTokenB = await tokenB.balanceOf(payer.address)
        const payments: PaymentStruct[] = [
          {
            token: tokenB.address,
            receivers: [userA.address, userB.address],
            amountsToTransfer: [500, 500],
          },
        ];

        await payroll.connect(payer).performSwapAndPayment(tokenB.address, 1000, deadline, [], payments)
        const newBalanceTokenB = await tokenB.balanceOf(payer.address)

        expect(await tokenB.balanceOf(userA.address)).to.equal(500)
        expect(await tokenB.balanceOf(userB.address)).to.equal(500)
        // We use thousands because values under 1 wei will be truncated
        expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.equal(1010)
      });
    });
  });
});

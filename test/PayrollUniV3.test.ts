import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {expect} from 'chai';
import {encodePriceSqrt} from './helpers/encodePriceSqrt';
import {getMaxTick, getMinTick} from './helpers/ticks';
import {Contract} from 'ethers';
import {network} from 'hardhat';

import {
  abi as FACTORY_ABI,
  bytecode as FACTORY_BYTECODE,
} from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json';

import {
  abi as ROUTER_ABI,
  bytecode as ROUTER_BYTECODE,
} from '@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json';

import {
  abi as NFT_MANAGER_ABI,
  bytecode as NFT_MANAGER_BYTECODE,
} from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json';

import {Token, Pool, Payroll} from '../typechain-types';
import {PaymentStruct, SwapV3Struct} from '../typechain-types/Payroll';

let router: Contract;
let nftManager: Contract;
let factory: Contract;
let tokenA: Token;
let tokenB: Token;
let tokenC: Token;
let pool: Pool;
let payroll: Payroll;
let admin: SignerWithAddress;
let payer: SignerWithAddress;
let userA: SignerWithAddress;
let userB: SignerWithAddress;
let feeAddress: SignerWithAddress;
let deadline = 0;
const poolFee = 3000;

describe.only('Contract: Payroll UniV3', () => {
  beforeEach(async () => {
    await network.provider.request({
      method: 'hardhat_reset',
    });

    [admin, payer, userA, userB, feeAddress] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    const token = (await Token.deploy('My Custom Token 0', 'MCT0')) as Token;
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

    const FACTORY = new ethers.ContractFactory(FACTORY_ABI, FACTORY_BYTECODE, admin);
    factory = await FACTORY.deploy();

    const NFT_MANAGER = new ethers.ContractFactory(NFT_MANAGER_ABI, NFT_MANAGER_BYTECODE, admin);
    nftManager = await NFT_MANAGER.deploy(factory.address, token.address, token.address);

    const Pool = await ethers.getContractFactory('Pool');
    pool = (await Pool.deploy(factory.address, nftManager.address)) as Pool;

    const Router = new ethers.ContractFactory(ROUTER_ABI, ROUTER_BYTECODE, admin);
    router = await Router.deploy(factory.address, token.address);

    const Payroll = await ethers.getContractFactory('Payroll');
    payroll = (await Payroll.deploy()) as Payroll;
    await payroll.initialize(router.address, false, feeAddress.address, 0);

    await pool.createPool(tokenA.address, tokenB.address, poolFee, encodePriceSqrt(1, 1));
    await pool.createPool(tokenC.address, tokenB.address, poolFee, encodePriceSqrt(1, 1));
    await tokenA.approve(pool.address, 10000000000000);
    await tokenB.approve(pool.address, 10000000000000);
    await tokenC.approve(pool.address, 10000000000000);

    await pool.mintNewPosition(
      tokenA.address,
      tokenB.address,
      poolFee,
      getMinTick(3000),
      getMaxTick(3000),
      100000000000,
      100000000000
    );

    await pool.mintNewPosition(
      tokenB.address,
      tokenC.address,
      poolFee,
      getMinTick(3000),
      getMaxTick(3000),
      100000000000,
      100000000000
    );

    await tokenB.transfer(payer.address, 1000000);

    const timestamp = Date.now() + 1000 * 60 * 60;
    deadline = Math.floor(timestamp / 1000);
  });

  describe('Tokens Approved', () => {
    beforeEach(async () => {
      await tokenB.connect(payer).approve(payroll.address, 1000000);
      await tokenA.connect(payer).approve(payroll.address, 1000000);
      await tokenC.connect(payer).approve(payroll.address, 1000000);
      await payroll.approveTokens([tokenA.address, tokenB.address, tokenC.address]);
    });

    it('should swap and transfer', async () => {
      const swaps: SwapV3Struct[] = [
        {token: tokenA.address, amountOut: 200, amountInMax: 250, poolFee: poolFee, path: []},
        {token: tokenC.address, amountOut: 200, amountInMax: 250, poolFee: poolFee, path: []},
      ];

      const previousBalanceTokenB = await tokenB.balanceOf(payer.address);

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

      await payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 500, deadline, swaps, payments);

      const newBalanceTokenB = await tokenB.balanceOf(payer.address);

      expect(await tokenA.balanceOf(userA.address)).to.equal(100);
      expect(await tokenA.balanceOf(userB.address)).to.equal(100);

      expect(await tokenB.balanceOf(userA.address)).to.equal(100);
      expect(await tokenB.balanceOf(userB.address)).to.equal(100);

      expect(await tokenC.balanceOf(userA.address)).to.equal(100);
      expect(await tokenC.balanceOf(userB.address)).to.equal(100);

      expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.closeTo(600, 4);
    });

    it('should only swap', async () => {
      const swaps: SwapV3Struct[] = [
        {token: tokenA.address, amountOut: 100, amountInMax: 150, poolFee: poolFee, path: []},
        {token: tokenC.address, amountOut: 100, amountInMax: 150, poolFee: poolFee, path: []},
      ];

      const previousBalanceTokenA = await tokenA.balanceOf(payer.address);
      const previousBalanceTokenC = await tokenC.balanceOf(payer.address);
      const previousBalanceTokenB = await tokenB.balanceOf(payer.address);

      await payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 300, deadline, swaps, []);

      const newBalanceTokenA = await tokenA.balanceOf(payer.address);
      const newBalanceTokenC = await tokenC.balanceOf(payer.address);
      const newBalanceTokenB = await tokenB.balanceOf(payer.address);

      expect(newBalanceTokenA.sub(previousBalanceTokenA)).to.equal(100);
      expect(newBalanceTokenC.sub(previousBalanceTokenC)).to.equal(100);
      expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.closeTo(200, 4);
    });

    it('should only transfer', async () => {
      const payments: PaymentStruct[] = [
        {
          token: tokenB.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50],
        },
      ];

      await payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 100, deadline, [], payments);

      expect(await tokenB.balanceOf(userA.address)).to.equal(50);
      expect(await tokenB.balanceOf(userB.address)).to.equal(50);
    });

    describe('Swap requirements', () => {
      it('should revert because amountsToTransfers and receivers length', async () => {
        const payments: PaymentStruct[] = [
          {
            token: tokenB.address,
            receivers: [userA.address, userB.address],
            amountsToTransfer: [50, 50, 50],
          },
        ];

        await expect(
          payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 1000, deadline, [], payments)
        ).to.be.revertedWith('Payroll: Arrays must have same length');
      });

      it('should revert because one receiver is a zero address', async () => {
        const payments: PaymentStruct[] = [
          {
            token: tokenB.address,
            receivers: [userA.address, ethers.constants.AddressZero],
            amountsToTransfer: [50, 50],
          },
        ];

        await expect(
          payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 1000, deadline, [], payments)
        ).to.be.revertedWith('Payroll: Cannot send to a 0 address');
      });

      it('should revert because amountInMax lower than expected to trade for amountOut', async () => {
        const swaps: SwapV3Struct[] = [{token: tokenA.address, amountOut: 200, amountInMax: 100, poolFee: poolFee, path: []}];

        await expect(
          payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 500, deadline, swaps, [])
        ).to.be.revertedWith('Too much requested');
      });

      it('should revert because token does not exists', async () => {
        const swaps: SwapV3Struct[] = [
          {token: ethers.constants.AddressZero, amountOut: 200, amountInMax: 250, poolFee: poolFee, path: []},
        ];

        await expect(payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 1000, deadline, swaps, [])).to.be
          .reverted;
      });

      it('should revert because amountOut 0', async () => {
        const swaps: SwapV3Struct[] = [{token: tokenA.address, amountOut: 0, amountInMax: 250, poolFee: poolFee, path: []}];

        await expect(
          payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 1000, deadline, swaps, [])
        ).to.be.revertedWith('AS');
      });

      it('should revert because of old deadline', async () => {
        const swaps: SwapV3Struct[] = [{token: tokenA.address, amountOut: 200, amountInMax: 250, poolFee: poolFee, path: []}];

        await expect(
          payroll
            .connect(payer)
            .performSwapV3AndPayment(tokenB.address, 1000, Math.floor(Date.now() / 1000) - 100, swaps, [])
        ).to.be.revertedWith('Transaction too old');
      });
    });

    describe('With 1% fees', () => {
      beforeEach(async () => {
        const fee = ethers.utils.parseUnits('0.01', 'ether');
        await payroll.setFee(fee);
      });

      it('should swap and transfer with fees activated', async () => {
        const swaps: SwapV3Struct[] = [
          // Add 1% fee to amountOut
          {token: tokenA.address, amountOut: 202, amountInMax: 250, poolFee: '3000', path: []},
          {token: tokenC.address, amountOut: 202, amountInMax: 250, poolFee: '3000', path: []},
        ];

        const previousBalanceTokenB = await tokenB.balanceOf(payer.address);

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

        await payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 500, deadline, swaps, payments);

        const newBalanceTokenB = await tokenB.balanceOf(payer.address);

        expect(await tokenA.balanceOf(userA.address)).to.equal(100);
        expect(await tokenA.balanceOf(userB.address)).to.equal(100);

        expect(await tokenB.balanceOf(userA.address)).to.equal(100);
        expect(await tokenB.balanceOf(userB.address)).to.equal(100);

        expect(await tokenC.balanceOf(userA.address)).to.equal(100);
        expect(await tokenC.balanceOf(userB.address)).to.equal(100);
        // Bigger slippage than uni v2
        expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.closeTo(606, 4);
      });

      it('should only swap  with fees activated', async () => {
        const swaps: SwapV3Struct[] = [
          {token: tokenA.address, amountOut: 100, amountInMax: 150, poolFee: '3000', path: []},
          {token: tokenC.address, amountOut: 100, amountInMax: 150, poolFee: '3000', path: []},
        ];

        const previousBalanceTokenA = await tokenA.balanceOf(payer.address);
        const previousBalanceTokenC = await tokenC.balanceOf(payer.address);
        const previousBalanceTokenB = await tokenB.balanceOf(payer.address);

        await payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 1000, deadline, swaps, []);

        const newBalanceTokenA = await tokenA.balanceOf(payer.address);
        const newBalanceTokenC = await tokenC.balanceOf(payer.address);
        const newBalanceTokenB = await tokenB.balanceOf(payer.address);

        expect(newBalanceTokenA.sub(previousBalanceTokenA)).to.equal(100);
        expect(newBalanceTokenC.sub(previousBalanceTokenC)).to.equal(100);
        // Bigger slippage than uni v2
        expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.closeTo(200, 4);
      });

      it('should only transfer with fees activated', async () => {
        const previousBalanceTokenB = await tokenB.balanceOf(payer.address);
        const payments: PaymentStruct[] = [
          {
            token: tokenB.address,
            receivers: [userA.address, userB.address],
            amountsToTransfer: [500, 500],
          },
        ];

        await payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 1000, deadline, [], payments);
        const newBalanceTokenB = await tokenB.balanceOf(payer.address);

        expect(await tokenB.balanceOf(userA.address)).to.equal(500);
        expect(await tokenB.balanceOf(userB.address)).to.equal(500);
        // We use thousands because values under 1 wei will be truncated
        expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.equal(1010);
      });
    });
  });
});

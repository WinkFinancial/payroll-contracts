import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {expect} from 'chai';
import {encodePriceSqrt} from './helpers/encodePriceSqrt';
import {getMaxTick, getMinTick} from './helpers/ticks';
import {Contract} from 'ethers';

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
import {PaymentStruct, SwapStruct} from '../typechain-types/Payroll';

let router: Contract;
let tokenA: Token;
let tokenB: Token;
let tokenC: Token;
let pool: Pool;
let payroll: Payroll;
let admin: SignerWithAddress;
let payer: SignerWithAddress;
let userA: SignerWithAddress;
let userB: SignerWithAddress;

describe('Contract: Payroll V3', () => {
  before(async () => {
    [admin, payer, userA, userB] = await ethers.getSigners();

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
    const factory = await FACTORY.deploy();

    const NFT_MANAGER = new ethers.ContractFactory(NFT_MANAGER_ABI, NFT_MANAGER_BYTECODE, admin);
    const nft_manager = await NFT_MANAGER.deploy(factory.address, token.address, token.address);

    const Pool = await ethers.getContractFactory('Pool');
    pool = (await Pool.deploy(factory.address, nft_manager.address)) as Pool;

    const Router = new ethers.ContractFactory(ROUTER_ABI, ROUTER_BYTECODE, admin);
    router = await Router.deploy(factory.address, token.address);

    const Payroll = await ethers.getContractFactory('Payroll');
    payroll = (await Payroll.deploy()) as Payroll;
    await payroll.initialize(router.address, tokenB.address, false);

    await pool.createPool(tokenA.address, tokenB.address, 3000, encodePriceSqrt(1, 1));
    await pool.createPool(tokenC.address, tokenB.address, 3000, encodePriceSqrt(1, 1));
    await tokenA.approve(pool.address, 10000000000000);
    await tokenB.approve(pool.address, 10000000000000);
    await tokenC.approve(pool.address, 10000000000000);

    await pool.mintNewPosition(
      tokenA.address,
      tokenB.address,
      3000,
      getMinTick(3000),
      getMaxTick(3000),
      1000000000000,
      1000000000000
    );

    await pool.mintNewPosition(
      tokenB.address,
      tokenC.address,
      3000,
      getMinTick(3000),
      getMaxTick(3000),
      1000000000000,
      1000000000000
    );
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

    it('should revert because amountsToTransfers and receivers length', async () => {
      const payments: PaymentStruct[] = [
        {
          token: tokenB.address,
          totalAmountToPay: 100,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50, 50],
        },
      ];

      expect(
        payroll.connect(payer).performSwapAndPayment(tokenB.address, 1000, deadline, [], payments)
      ).to.be.revertedWith('Arrays must have same length');
    });

    it('should revert because one receiver is a zero address', async () => {
      const payments: PaymentStruct[] = [
        {
          token: tokenB.address,
          totalAmountToPay: 100,
          receivers: [userA.address, ethers.constants.AddressZero],
          amountsToTransfer: [50, 50],
        },
      ];

      expect(
        payroll.connect(payer).performSwapAndPayment(tokenB.address, 1000, deadline, [], payments)
      ).to.be.revertedWith('Cannot send to a 0 address');
    });

    it('should update swapRouter', async () => {
      await payroll.setSwapRouter(router.address, tokenB.address, true);
      expect(await payroll.isSwapV2()).to.be.true;
    });

    it('should not update swapRouter with a zero address', async () => {
      expect(payroll.setSwapRouter(ethers.constants.AddressZero, tokenB.address, true)).to.be.revertedWith(
        'Cannot set a 0 address as swapRouter'
      );
    });

    it('should approve another ERC20 to swapRouter', async () => {
      expect(await tokenA.allowance(payroll.address, router.address)).to.equal('0');
      await payroll.approveERC20ToSwapRouter(tokenA.address);
      expect(await tokenA.allowance(payroll.address, router.address)).to.not.equal('0');
    });
  });
});

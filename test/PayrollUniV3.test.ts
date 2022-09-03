import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {expect} from 'chai';
import {encodePriceSqrt} from './helpers/encodePriceSqrt';
import {getMaxTick, getMinTick} from './helpers/ticks';
import {Contract} from 'ethers';
import {network} from 'hardhat';
import WETH9 from '@uniswap/v2-periphery/build/WETH9.json';
import {IWETH9} from '@uniswap/v3-periphery/typechain/IWETH9';

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
import {PaymentStruct, SwapV2Struct, SwapV3Struct} from '../typechain-types/Payroll';
import {getPath} from './helpers/uniswap';

let router: Contract;
let nftManager: Contract;
let factory: Contract;
let tokenA: Token;
let tokenB: Token;
let tokenC: Token;
let weth: IWETH9;
let pool: Pool;
let payroll: Payroll;
let admin: SignerWithAddress;
let payer: SignerWithAddress;
let userA: SignerWithAddress;
let userB: SignerWithAddress;
let feeAddress: SignerWithAddress;
let deadline = 0;
const poolFee = 3000;

describe('Contract: Payroll UniV3', () => {
  beforeEach(async () => {
    await network.provider.request({
      method: 'hardhat_reset',
    });

    [admin, payer, userA, userB, feeAddress] = await ethers.getSigners();

    const WETH9Contract = new ethers.ContractFactory(WETH9.abi, WETH9.bytecode, admin);
    weth = (await WETH9Contract.deploy()) as IWETH9;

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

    const FACTORY = new ethers.ContractFactory(FACTORY_ABI, FACTORY_BYTECODE, admin);
    factory = await FACTORY.deploy();

    const NFT_MANAGER = new ethers.ContractFactory(NFT_MANAGER_ABI, NFT_MANAGER_BYTECODE, admin);
    nftManager = await NFT_MANAGER.deploy(factory.address, weth.address, weth.address);

    const Pool = await ethers.getContractFactory('Pool');
    pool = (await Pool.deploy(factory.address, nftManager.address)) as Pool;

    const Router = new ethers.ContractFactory(ROUTER_ABI, ROUTER_BYTECODE, admin);
    router = await Router.deploy(factory.address, weth.address);

    const Payroll = await ethers.getContractFactory('Payroll');
    payroll = (await Payroll.deploy()) as Payroll;
    await payroll.initialize(router.address, false, feeAddress.address, 0);

    await pool.createPool(tokenA.address, tokenB.address, poolFee, encodePriceSqrt(1, 1));
    await pool.createPool(tokenC.address, tokenB.address, poolFee, encodePriceSqrt(1, 1));
    await pool.createPool(weth.address, tokenA.address, poolFee, encodePriceSqrt(1, 1));
    await pool.createPool(weth.address, tokenC.address, poolFee, encodePriceSqrt(1, 1));
    await tokenA.approve(pool.address, ethers.utils.parseEther('300.0'));
    await tokenB.approve(pool.address, ethers.utils.parseEther('300.0'));
    await tokenC.approve(pool.address, ethers.utils.parseEther('300.0'));
    await weth.approve(pool.address, ethers.utils.parseEther('300.0'));

    await weth.deposit({value: ethers.utils.parseEther('300.0')});

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

    await pool.mintNewPosition(
      weth.address,
      tokenA.address,
      poolFee,
      getMinTick(3000),
      getMaxTick(3000),
      ethers.utils.parseEther('100.0'),
      ethers.utils.parseEther('100.0')
    );

    await pool.mintNewPosition(
      weth.address,
      tokenC.address,
      poolFee,
      getMinTick(3000),
      getMaxTick(3000),
      ethers.utils.parseEther('100.0'),
      ethers.utils.parseEther('100.0')
    );

    await tokenB.transfer(payer.address, ethers.utils.parseEther('100.0'));

    const timestamp = Date.now() + 1000 * 60 * 60;
    deadline = Math.floor(timestamp / 1000);
  });

  describe('Tokens Approved', () => {
    beforeEach(async () => {
      await tokenB.connect(payer).approve(payroll.address, ethers.utils.parseEther('1000.0'));
      await tokenA.connect(payer).approve(payroll.address, ethers.utils.parseEther('1000.0'));
      await tokenC.connect(payer).approve(payroll.address, ethers.utils.parseEther('1000.0'));
      await weth.connect(payer).approve(payroll.address, ethers.utils.parseEther('1000.0'));
      await payroll.approveTokens([tokenA.address, tokenB.address, tokenC.address, weth.address]);
    });

    it('should swap and transfer', async () => {
      const swaps: SwapV3Struct[] = [
        {amountOut: 200, amountInMax: 250, path: getPath(tokenA.address, poolFee, tokenB.address)},
        {amountOut: 200, amountInMax: 250, path: getPath(tokenC.address, poolFee, tokenB.address)},
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
        {amountOut: 100, amountInMax: 150, path: getPath(tokenA.address, poolFee, tokenB.address)},
        {amountOut: 100, amountInMax: 150, path: getPath(tokenC.address, poolFee, tokenB.address)},
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

    it('should only swap from native token to erc20', async () => {
      const swaps: SwapV3Struct[] = [
        {amountOut: 100, amountInMax: 150, path: getPath(tokenA.address, poolFee, weth.address)},
      ];

      const previousBalanceTokenA = await tokenA.balanceOf(payer.address);

      await payroll.connect(payer).performSwapV3ETH(150, deadline, swaps, {
        value: 150,
      });

      const newBalanceTokenA = await tokenA.balanceOf(payer.address);

      expect(newBalanceTokenA.sub(previousBalanceTokenA)).to.equal(100);
    });

    it('should only swap from erc20 to native token', async () => {
      const swaps: SwapV3Struct[] = [
        {
          amountOut: ethers.utils.parseEther('1.0'),
          amountInMax: ethers.utils.parseEther('1.5'),
          path: getPath(weth.address, poolFee, tokenA.address),
        },
      ];

      await tokenA.transfer(payer.address, ethers.utils.parseEther('5.0'));

      await payer.sendTransaction({
        to: ethers.constants.AddressZero,
        value: (await ethers.provider.getBalance(payer.address)).sub(ethers.utils.parseEther('0.1')),
      });

      await payroll.connect(payer).performSwapV3(tokenA.address, ethers.utils.parseEther('1.5'), deadline, swaps);

      expect(await ethers.provider.getBalance(payer.address)).to.be.closeTo(ethers.utils.parseEther('1.0'), ethers.utils.parseEther('0.1'));
    });

    it('should only swap from erc20 to native token using performSwapV3AndPayment', async () => {
      const swaps: SwapV3Struct[] = [
        {
          amountOut: ethers.utils.parseEther('1.0'),
          amountInMax: ethers.utils.parseEther('1.5'),
          path: getPath(weth.address, poolFee, tokenA.address),
        },
      ];

      await tokenA.transfer(payer.address, ethers.utils.parseEther('5.0'));

      await payer.sendTransaction({
        to: ethers.constants.AddressZero,
        value: (await ethers.provider.getBalance(payer.address)).sub(ethers.utils.parseEther('0.1')),
      });

      await payroll.connect(payer).performSwapV3AndPayment(tokenA.address, ethers.utils.parseEther('1.5'), deadline, swaps, []);

      expect(await ethers.provider.getBalance(payer.address)).to.be.closeTo(ethers.utils.parseEther('1.0'), ethers.utils.parseEther('0.1'));
    });

    it('should swap from erc20 to native token and transfer', async () => {
      const swaps: SwapV3Struct[] = [
        {
          amountOut: ethers.utils.parseEther('1.0'),
          amountInMax: ethers.utils.parseEther('1.5'),
          path: getPath(weth.address, poolFee, tokenA.address),
        },
      ];

      const payments: PaymentStruct[] = [
        {
          token: tokenA.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50],
        },
        {
          token: tokenB.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [75, 75],
        },
        {
          token: ethers.constants.AddressZero,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50],
        },
      ];

      await tokenA.transfer(payer.address, ethers.utils.parseEther('5.0'));

      await payer.sendTransaction({
        to: ethers.constants.AddressZero,
        value: (await ethers.provider.getBalance(payer.address)).sub(ethers.utils.parseEther('0.1')),
      });

      const previousBalanceNativeTokenUserA = await ethers.provider.getBalance(userA.address);
      const previousBalanceNativeTokenUserB = await ethers.provider.getBalance(userB.address);

      await payroll.connect(payer).performSwapV3AndPayment(tokenA.address, ethers.utils.parseEther('1.5'), deadline, swaps, payments);

      expect(await tokenA.balanceOf(userA.address)).to.equal(50);
      expect(await tokenA.balanceOf(userB.address)).to.equal(50);

      expect(await tokenB.balanceOf(userA.address)).to.equal(75);
      expect(await tokenB.balanceOf(userB.address)).to.equal(75);

      expect(await ethers.provider.getBalance(userA.address)).to.equal(previousBalanceNativeTokenUserA.add(50));
      expect(await ethers.provider.getBalance(userB.address)).to.equal(previousBalanceNativeTokenUserB.add(50));

      expect(await ethers.provider.getBalance(payer.address)).to.be.closeTo(ethers.utils.parseEther('1.0'), ethers.utils.parseEther('0.1'));
    });

    it('should swap native token and transfer', async () => {
      const swaps: SwapV3Struct[] = [
        {
          amountOut: 150,
          amountInMax: 200,
          path: getPath(tokenA.address, poolFee, weth.address),
        },
        {
          amountOut: 150,
          amountInMax: 200,
          path: getPath(tokenC.address, poolFee, weth.address),
        },
      ];

      const payments: PaymentStruct[] = [
        {
          token: tokenA.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50],
        },
        {
          token: tokenC.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [75, 75],
        },
        {
          token: ethers.constants.AddressZero,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50],
        },
      ];

      const previousBalanceNativeTokenUserA = await ethers.provider.getBalance(userA.address);
      const previousBalanceNativeTokenUserB = await ethers.provider.getBalance(userB.address);

      await payroll.connect(payer).performSwapV3AndPaymentETH(300, deadline, swaps, payments, {
        value: 500,
      });

      expect(await tokenA.balanceOf(userA.address)).to.equal(50);
      expect(await tokenA.balanceOf(userB.address)).to.equal(50);
      expect(await tokenA.balanceOf(payer.address)).to.equal(50);

      expect(await tokenC.balanceOf(userA.address)).to.equal(75);
      expect(await tokenC.balanceOf(userB.address)).to.equal(75);

      expect(await ethers.provider.getBalance(userA.address)).to.equal(previousBalanceNativeTokenUserA.add(50));
      expect(await ethers.provider.getBalance(userB.address)).to.equal(previousBalanceNativeTokenUserB.add(50));
    });

    it('should revert when not enough ETH is sent to swap', async () => {
      const swaps: SwapV3Struct[] = [{amountOut: 100, amountInMax: 150, path: ethers.utils.randomBytes(5)}];

      await expect(payroll.connect(payer).performSwapV3ETH(150, deadline, swaps, {value: 100})).to.be.revertedWith(
        'Payroll: Not enough msg.value'
      );

      await expect(
        payroll.connect(payer).performSwapV3AndPaymentETH(150, deadline, swaps, [], {value: 100})
      ).to.be.revertedWith('Payroll: Not enough msg.value');
    });

    it('should revert with an empty swap array', async () => {
      await expect(payroll.connect(payer).performSwapV3(tokenB.address, 500, deadline, [])).to.be.revertedWith(
        'Payroll: Empty swaps'
      );

      await expect(payroll.connect(payer).performSwapV3ETH(500, deadline, [], {value: 500})).to.be.revertedWith(
        'Payroll: Empty swaps'
      );
    });

    it('should revert when it try to use uniswapV2', async () => {
      const swaps: SwapV2Struct[] = [{amountOut: 100, amountInMax: 150, path: []}];

      await expect(payroll.connect(payer).performSwapV2(tokenB.address, 500, deadline, swaps)).to.be.revertedWith(
        'Payroll: Not uniswapV2'
      );

      await expect(payroll.connect(payer).performSwapV2ETH(500, deadline, swaps, {value: 500})).to.be.revertedWith(
        'Payroll: Not uniswapV2'
      );

      await expect(
        payroll.connect(payer).performSwapV2AndPayment(tokenB.address, 500, deadline, swaps, [])
      ).to.be.revertedWith('Payroll: Not uniswapV2');

      await expect(
        payroll.connect(payer).performSwapV2AndPaymentETH(500, deadline, swaps, [], {value: 500})
      ).to.be.revertedWith('Payroll: Not uniswapV2');
    });

    it('should revert when a path is not sent', async () => {
      const swaps: SwapV3Struct[] = [{amountOut: 100, amountInMax: 150, path: []}];

      await expect(payroll.connect(payer).performSwapV3(tokenB.address, 150, deadline, swaps)).to.be.revertedWith(
        'Payroll: Empty path'
      );

      await expect(payroll.connect(payer).performSwapV3ETH(150, deadline, swaps, {value: 150})).to.be.revertedWith(
        'Payroll: Empty path'
      );

      await expect(
        payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 150, deadline, swaps, [])
      ).to.be.revertedWith('Payroll: Empty path');

      await expect(
        payroll.connect(payer).performSwapV3AndPaymentETH(150, deadline, swaps, [], {value: 150})
      ).to.be.revertedWith('Payroll: Empty path');
    });

    it('should revert when path[0] in SwapStruct is not the token to swap', async () => {
      const swaps: SwapV3Struct[] = [{amountOut: 100, amountInMax: 150, path: getPath(tokenA.address, poolFee, tokenC.address)}];

      await expect(payroll.connect(payer).performSwapV3(tokenB.address, 150, deadline, swaps)).to.be.revertedWith(
        'Payroll: Swap not token origin'
      );

      await expect(payroll.connect(payer).performSwapV3ETH(150, deadline, swaps, {value: 150})).to.be.revertedWith(
        'Payroll: Swap not native token'
      );

      await expect(
        payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 150, deadline, swaps, [])
      ).to.be.revertedWith('Payroll: Swap not token origin');

      await expect(
        payroll.connect(payer).performSwapV3AndPaymentETH(150, deadline, swaps, [], {value: 150})
      ).to.be.revertedWith('Payroll: Swap not native token');
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
        const swaps: SwapV3Struct[] = [
          {amountOut: 200, amountInMax: 100, path: getPath(tokenA.address, poolFee, tokenB.address)},
        ];

        await expect(
          payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 500, deadline, swaps, [])
        ).to.be.revertedWith('Too much requested');
      });

      it('should revert because token does not exists', async () => {
        const swaps: SwapV3Struct[] = [
          {amountOut: 200, amountInMax: 250, path: getPath(ethers.constants.AddressZero, poolFee, tokenB.address)},
        ];

        await expect(payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 1000, deadline, swaps, [])).to.be
          .reverted;
      });

      it('should revert because amountOut 0', async () => {
        const swaps: SwapV3Struct[] = [
          {amountOut: 0, amountInMax: 250, path: getPath(tokenA.address, poolFee, tokenB.address)},
        ];

        await expect(
          payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 1000, deadline, swaps, [])
        ).to.be.revertedWith('AS');
      });

      it('should revert because of old deadline', async () => {
        const swaps: SwapV3Struct[] = [
          {amountOut: 200, amountInMax: 250, path: getPath(tokenA.address, poolFee, tokenB.address)},
        ];

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
          {amountOut: 202, amountInMax: 250, path: getPath(tokenA.address, poolFee, tokenB.address)},
          {amountOut: 202, amountInMax: 250, path: getPath(tokenC.address, poolFee, tokenB.address)},
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
          {amountOut: 100, amountInMax: 150, path: getPath(tokenA.address, poolFee, tokenB.address)},
          {amountOut: 100, amountInMax: 150, path: getPath(tokenC.address, poolFee, tokenB.address)},
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

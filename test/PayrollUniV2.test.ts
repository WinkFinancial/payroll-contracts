import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {BigNumber, Contract} from 'ethers';
import {ethers, network} from 'hardhat';
import {Payroll, Token} from '../typechain-types';
import {PaymentStruct, SwapV2Struct, SwapV3Struct} from '../typechain-types/Payroll';
import {addLiquidity, addLiquidityETH, createPair, deploy, DeployResult} from './helpers/uniswap';

let uniswapV2Router02: Contract;
let tokenA: Token;
let tokenB: Token;
let tokenC: Token;
let tokenD: Token;
let payroll: Payroll;
let admin: SignerWithAddress;
let payer: SignerWithAddress;
let userA: SignerWithAddress;
let userB: SignerWithAddress;
let feeAddress: SignerWithAddress;
let uniswapV2: DeployResult;
let deadline = 0;

describe('Contract: Payroll UniV2', () => {
  beforeEach(async () => {
    await network.provider.request({
      method: 'hardhat_reset',
    });
    [admin, payer, userA, userB, feeAddress] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    tokenA = (await Token.deploy('Token_A', 'TKA')) as Token;
    tokenB = (await Token.deploy('Token_B', 'TKB')) as Token;
    tokenC = (await Token.deploy('Token_C', 'TKC')) as Token;
    tokenD = (await Token.deploy('Token_D', 'TKD')) as Token;

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

    uniswapV2 = await deploy({owner: admin});
    uniswapV2Router02 = uniswapV2.uniswapV2Router02;

    const Payroll = await ethers.getContractFactory('Payroll');
    payroll = (await Payroll.deploy()) as Payroll;
    await payroll.initialize(uniswapV2Router02.address, true, feeAddress.address, 0);

    await createPair(tokenA.address, tokenB.address);
    await createPair(tokenC.address, tokenB.address);
    await createPair(tokenB.address, tokenD.address);
    await createPair(tokenA.address, uniswapV2.WETH.address);

    await tokenA.approve(uniswapV2Router02.address, 10000000000000);
    await tokenB.approve(uniswapV2Router02.address, 10000000000000);
    await tokenC.approve(uniswapV2Router02.address, 10000000000000);
    await tokenD.approve(uniswapV2Router02.address, 10000000000000);

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

    await addLiquidity({
      owner: admin,
      token0: tokenB,
      amountA: BigNumber.from('1000000000000'),
      token1: tokenD,
      amountB: BigNumber.from('1000000000000'),
    });

    await addLiquidityETH({
      owner: admin,
      token0: tokenA,
      token0mount: ethers.utils.parseEther('500.0'),
      wethAmount: ethers.utils.parseEther('500.0'),
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
      await payroll.approveTokens([tokenA.address, tokenB.address, tokenC.address]);
    });

    it('should swap and transfer', async () => {
      const swaps: SwapV2Struct[] = [
        {amountOut: 200, amountInMax: 250, path: [tokenB.address, tokenA.address]},
        {amountOut: 200, amountInMax: 250, path: [tokenB.address, tokenC.address]},
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

      await payroll.connect(payer).performSwapV2AndPayment(tokenB.address, 1000, deadline, swaps, payments);

      const newBalanceTokenB = await tokenB.balanceOf(payer.address);

      expect(await tokenA.balanceOf(userA.address)).to.equal(100);
      expect(await tokenA.balanceOf(userB.address)).to.equal(100);

      expect(await tokenB.balanceOf(userA.address)).to.equal(100);
      expect(await tokenB.balanceOf(userB.address)).to.equal(100);

      expect(await tokenC.balanceOf(userA.address)).to.equal(100);
      expect(await tokenC.balanceOf(userB.address)).to.equal(100);

      expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.closeTo(600, 2);
    });

    it('performSwapV2 test, should swap 3 tokens', async () => {
      const swaps: SwapV2Struct[] = [
        {amountOut: 200, amountInMax: 250, path: [tokenB.address, tokenA.address]},
        {amountOut: 200, amountInMax: 250, path: [tokenB.address, tokenC.address]},
        {amountOut: 200, amountInMax: 250, path: [tokenB.address, tokenD.address]},
      ];

      await payroll.connect(payer).performSwapV2(tokenB.address, 1000, deadline, swaps);

      expect(await tokenA.balanceOf(payer.address)).to.equal(200);
      expect(await tokenC.balanceOf(payer.address)).to.equal(200);
      expect(await tokenD.balanceOf(payer.address)).to.equal(200);
    });

    it('should only swap', async () => {
      const swaps: SwapV2Struct[] = [
        {amountOut: 100, amountInMax: 150, path: [tokenB.address, tokenA.address]},
        {amountOut: 100, amountInMax: 150, path: [tokenB.address, tokenC.address]},
      ];

      const previousBalanceTokenA = await tokenA.balanceOf(payer.address);
      const previousBalanceTokenC = await tokenC.balanceOf(payer.address);
      const previousBalanceTokenB = await tokenB.balanceOf(payer.address);

      await payroll.connect(payer).performSwapV2AndPayment(tokenB.address, 300, deadline, swaps, []);

      const newBalanceTokenA = await tokenA.balanceOf(payer.address);
      const newBalanceTokenC = await tokenC.balanceOf(payer.address);
      const newBalanceTokenB = await tokenB.balanceOf(payer.address);

      expect(newBalanceTokenA.sub(previousBalanceTokenA)).to.equal(100);
      expect(newBalanceTokenC.sub(previousBalanceTokenC)).to.equal(100);
      expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.closeTo(200, 2);
    });

    it('should only swap native token', async () => {
      const swaps: SwapV2Struct[] = [
        {
          amountOut: 100,
          amountInMax: 150,
          path: [uniswapV2.WETH.address, tokenA.address],
        },
      ];

      const previousBalanceTokenA = await tokenA.balanceOf(payer.address);

      await payroll.connect(payer).performSwapV2ETH(150, deadline, swaps, {
        value: 150,
      });

      const newBalanceTokenA = await tokenA.balanceOf(payer.address);

      expect(newBalanceTokenA.sub(previousBalanceTokenA)).to.equal(100);
    });

    it('should swap native token and transfer', async () => {
      const swaps: SwapV2Struct[] = [
        {
          amountOut: 150,
          amountInMax: 200,
          path: [uniswapV2.WETH.address, tokenA.address],
        },
      ];

      const payments: PaymentStruct[] = [
        {
          token: tokenA.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50],
        },
        {
          token: ethers.constants.AddressZero,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50],
        },
      ];

      const previousBalanceNativeTokenUserA = await ethers.provider.getBalance(userA.address);
      const previousBalanceNativeTokenUserB = await ethers.provider.getBalance(userB.address);

      await payroll.connect(payer).performSwapV2AndPaymentETH(300, deadline, swaps, payments, {
        value: 300,
      });

      expect(await tokenA.balanceOf(userA.address)).to.equal(50);
      expect(await tokenA.balanceOf(userB.address)).to.equal(50);

      expect(await ethers.provider.getBalance(userA.address)).to.equal(previousBalanceNativeTokenUserA.add(50));
      expect(await ethers.provider.getBalance(userB.address)).to.equal(previousBalanceNativeTokenUserB.add(50));
    });

    it('should revert with an empty swap array', async () => {
      await expect(payroll.connect(payer).performSwapV2(tokenB.address, 500, deadline, [])).to.be.revertedWith(
        'Payroll: Empty swaps'
      );

      await expect(payroll.connect(payer).performSwapV2ETH(500, deadline, [], {value: 500})).to.be.revertedWith(
        'Payroll: Empty swaps'
      );
    });

    it('should revert when it try to use uniswapV3', async () => {
      const swaps: SwapV3Struct[] = [{amountOut: 100, amountInMax: 150, path: ethers.utils.randomBytes(5)}];

      await expect(payroll.connect(payer).performSwapV3(tokenB.address, 500, deadline, swaps)).to.be.revertedWith(
        'Payroll: Not uniswapV3'
      );

      await expect(payroll.connect(payer).performSwapV3ETH(500, deadline, swaps, {value: 500})).to.be.revertedWith(
        'Payroll: Not uniswapV3'
      );

      await expect(
        payroll.connect(payer).performSwapV3AndPayment(tokenB.address, 500, deadline, swaps, [])
      ).to.be.revertedWith('Payroll: Not uniswapV3');

      await expect(payroll.connect(payer).performSwapV3AndPaymentETH(500, deadline, swaps, [])).to.be.revertedWith(
        'Payroll: Not uniswapV3'
      );
    });

    it('should revert when a path is not sent', async () => {
      const swaps: SwapV2Struct[] = [{amountOut: 100, amountInMax: 150, path: []}];

      await expect(payroll.connect(payer).performSwapV2(tokenB.address, 150, deadline, swaps)).to.be.revertedWith(
        'Payroll: Empty path'
      );

      await expect(payroll.connect(payer).performSwapV2ETH(150, deadline, swaps, {value: 150})).to.be.revertedWith(
        'Payroll: Empty path'
      );

      await expect(
        payroll.connect(payer).performSwapV2AndPayment(tokenB.address, 150, deadline, swaps, [])
      ).to.be.revertedWith('Payroll: Empty path');

      await expect(
        payroll.connect(payer).performSwapV2AndPaymentETH(150, deadline, swaps, [], {value: 150})
      ).to.be.revertedWith('Payroll: Empty path');
    });

    it('should revert when path[0] in SwapStruct is not the token to swap', async () => {
      const swaps: SwapV2Struct[] = [{amountOut: 100, amountInMax: 150, path: [tokenA.address, tokenC.address]}];

      await expect(payroll.connect(payer).performSwapV2(tokenB.address, 150, deadline, swaps)).to.be.revertedWith(
        'Payroll: Swap not token origin'
      );

      await expect(payroll.connect(payer).performSwapV2ETH(150, deadline, swaps, {value: 150})).to.be.revertedWith(
        'Payroll: Swap not native token'
      );

      await expect(
        payroll.connect(payer).performSwapV2AndPayment(tokenB.address, 150, deadline, swaps, [])
      ).to.be.revertedWith('Payroll: Swap not token origin');

      await expect(
        payroll.connect(payer).performSwapV2AndPaymentETH(150, deadline, swaps, [], {value: 150})
      ).to.be.revertedWith('Payroll: Swap not native token');
    });

    it('should only transfer', async () => {
      const previousBalanceTokenB = await tokenB.balanceOf(payer.address);
      const payments: PaymentStruct[] = [
        {
          token: tokenB.address,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50],
        },
      ];

      await payroll.connect(payer).performSwapV2AndPayment(tokenB.address, 100, deadline, [], payments);

      const newBalanceTokenB = await tokenB.balanceOf(payer.address);

      expect(await tokenB.balanceOf(userA.address)).to.equal(50);
      expect(await tokenB.balanceOf(userB.address)).to.equal(50);
      expect(previousBalanceTokenB.sub(newBalanceTokenB)).to.be.equal(100);
    });

    describe('Payroll required', () => {
      it('should revert because amountInMax lower than expected to trade for amountOut', async () => {
        const swaps: SwapV2Struct[] = [{amountOut: 200, amountInMax: 100, path: [tokenB.address, tokenA.address]}];

        await expect(
          payroll.connect(payer).performSwapV2AndPayment(tokenB.address, 500, deadline, swaps, [])
        ).to.be.revertedWith('UniswapV2Router: EXCESSIVE_INPUT_AMOUNT');
      });

      it('should revert because token does not exists', async () => {
        const swaps: SwapV2Struct[] = [
          {amountOut: 200, amountInMax: 250, path: [ethers.constants.AddressZero, tokenA.address]},
        ];

        await expect(payroll.connect(payer).performSwapV2AndPayment(tokenB.address, 1000, deadline, swaps, [])).to.be
          .reverted;
      });

      it('should revert because amountOut 0', async () => {
        const swaps: SwapV2Struct[] = [{amountOut: 0, amountInMax: 250, path: [tokenB.address, tokenA.address]}];

        await expect(payroll.connect(payer).performSwapV2AndPayment(tokenB.address, 1000, deadline, swaps, [])).to.be
          .reverted;
      });

      it('should revert because amountOut 0', async () => {
        const swaps: SwapV2Struct[] = [{amountOut: 0, amountInMax: 250, path: [tokenB.address, tokenA.address]}];

        await expect(
          payroll.connect(payer).performSwapV2AndPayment(tokenB.address, 1000, deadline, swaps, [])
        ).to.be.revertedWith('UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT');
      });

      it('should revert because of old deadline', async () => {
        const swaps: SwapV2Struct[] = [{amountOut: 200, amountInMax: 250, path: [tokenB.address, tokenA.address]}];

        await expect(
          payroll
            .connect(payer)
            .performSwapV2AndPayment(tokenB.address, 1000, Math.floor(Date.now() / 1000) - 100, swaps, [])
        ).to.be.revertedWith('UniswapV2Router: EXPIRED');
      });
    });

    describe('With 1% fees', () => {
      beforeEach(async () => {
        const fee = ethers.utils.parseUnits('0.01', 'ether');
        await payroll.setFee(fee);
      });

      it('should swap and transfer with fees activated', async () => {
        const swaps: SwapV2Struct[] = [
          // Add 1% fee to amountOut
          {amountOut: 202, amountInMax: 250, path: [tokenB.address, tokenA.address]},
          {amountOut: 202, amountInMax: 250, path: [tokenB.address, tokenC.address]},
        ];

        const previousBalanceTokenB = await tokenB.balanceOf(payer.address);

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

        await payroll.connect(payer).performSwapV2AndPayment(tokenB.address, 500, deadline, swaps, payments);

        const newBalanceTokenB = await tokenB.balanceOf(payer.address);
        const feeBalanceTokenA = await tokenA.balanceOf(feeAddress.address);
        const feeBalanceTokenB = await tokenB.balanceOf(feeAddress.address);
        const feeBalanceTokenC = await tokenC.balanceOf(feeAddress.address);

        expect(await tokenA.balanceOf(userA.address)).to.equal(100);
        expect(await tokenA.balanceOf(userB.address)).to.equal(100);

        expect(await tokenB.balanceOf(userA.address)).to.equal(100);
        expect(await tokenB.balanceOf(userB.address)).to.equal(100);

        expect(await tokenC.balanceOf(userA.address)).to.equal(100);
        expect(await tokenC.balanceOf(userB.address)).to.equal(100);

        expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.closeTo(606, 2); // Tokens used for swap

        expect(feeBalanceTokenA).to.be.equal(2);
        expect(feeBalanceTokenB).to.be.equal(2);
        expect(feeBalanceTokenC).to.be.equal(2);
      });

      it('should only swap  with fees activated', async () => {
        const swaps: SwapV2Struct[] = [
          {amountOut: 100, amountInMax: 150, path: [tokenB.address, tokenA.address]},
          {amountOut: 100, amountInMax: 150, path: [tokenB.address, tokenC.address]},
        ];

        const previousBalanceTokenA = await tokenA.balanceOf(payer.address);
        const previousBalanceTokenC = await tokenC.balanceOf(payer.address);
        const previousBalanceTokenB = await tokenB.balanceOf(payer.address);

        await payroll.connect(payer).performSwapV2AndPayment(tokenB.address, 1000, deadline, swaps, []);

        const newBalanceTokenA = await tokenA.balanceOf(payer.address);
        const newBalanceTokenC = await tokenC.balanceOf(payer.address);
        const newBalanceTokenB = await tokenB.balanceOf(payer.address);

        expect(newBalanceTokenA.sub(previousBalanceTokenA)).to.equal(100);
        expect(newBalanceTokenC.sub(previousBalanceTokenC)).to.equal(100);
        expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.closeTo(200, 2);
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

        await payroll.connect(payer).performSwapV2AndPayment(tokenB.address, 1000, deadline, [], payments);
        const newBalanceTokenB = await tokenB.balanceOf(payer.address);

        expect(await tokenB.balanceOf(userA.address)).to.equal(500);
        expect(await tokenB.balanceOf(userB.address)).to.equal(500);
        // We use thousands because values under 1 wei will be truncated
        expect(previousBalanceTokenB.sub(newBalanceTokenB).toNumber()).to.be.equal(1010);
      });
    });
  });
});

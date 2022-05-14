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

describe('Contract: Payroll UniV2', () => {
  beforeEach(async () => {
    await network.provider.request({
      method: "hardhat_reset"
    });
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
    await payroll.initialize(uniswapV2Router02.address, true);


    await tokenB.transfer(payer.address, 1000000);
    await tokenA.transfer(payer.address, 1000000);
    await tokenC.transfer(payer.address, 1000000);

  });

  describe('Tokens Approved', () => {
    beforeEach(async () => {
      await tokenB.connect(payer).approve(payroll.address, 1000000);
      await tokenA.connect(payer).approve(payroll.address, 1000000);
      await tokenC.connect(payer).approve(payroll.address, 1000000);
      await payroll.approveToken([tokenA.address, tokenB.address, tokenC.address])
    })

    it('should performMultiPayment', async () => {
      const payments: PaymentStruct[] = [
        {
          token: tokenB.address,
          totalAmountToPay: 100,
          receivers: [userA.address, userB.address],
          amountsToTransfer: [50, 50],
        },
      ];

      await payroll.connect(payer).performMultiPayment(payments);

      expect(await tokenB.balanceOf(userA.address)).to.equal(50)
      expect(await tokenB.balanceOf(userB.address)).to.equal(50)
    });

    it('should update swapRouter', async () => {
      const newRouter = ethers.Wallet.createRandom()
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
      await expect(payrollTest.initialize(ethers.constants.AddressZero, false)).to.be.revertedWith('Payroll: Cannot set a 0 address as swapRouter');
    });


  });
});

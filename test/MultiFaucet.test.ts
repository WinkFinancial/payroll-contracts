import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';
import {expect} from 'chai';
import {Token, MultiFaucet} from '../typechain-types';
import {network} from 'hardhat';

let tokenA: Token;
let tokenB: Token;
let multiFaucet: MultiFaucet;
let userA: SignerWithAddress;
let userB: SignerWithAddress;

describe('Contract: MultiFaucet', () => {
  beforeEach(async () => {
    await network.provider.request({
      method: 'hardhat_reset',
    });

    [userA, userB] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    tokenA = (await Token.deploy('Token_A', 'TKA')) as Token;
    tokenB = (await Token.deploy('Token_A', 'TKA')) as Token;

    const MultiFaucet = await ethers.getContractFactory('MultiFaucet');
    multiFaucet = (await MultiFaucet.deploy()) as MultiFaucet;

    await multiFaucet.addFaucet(tokenA.address, 100);
    await tokenA.transfer(multiFaucet.address, 100);
  });

  describe('Faucet', () => {
    it('should add a faucet', async () => {
      const faucet = await multiFaucet.faucets(tokenA.address);
      expect(faucet[0]).to.equal(userA.address);
      expect(faucet[1]).to.equal(100);
    });

    it('should not add an existing faucet', async () => {
      await expect(multiFaucet.addFaucet(tokenA.address, 100)).to.be.revertedWith(
        'MultiFaucet: This faucet already exist, you can still deposit funds'
      );
    });

    it('should update a faucet', async () => {
      await multiFaucet.updateFaucet(tokenA.address, 200);
      const faucet = await multiFaucet.faucets(tokenA.address);
      expect(faucet[0]).to.equal(userA.address);
      expect(faucet[1]).to.equal(200);
    });

    it('should not update the faucet if you are not the owner', async () => {
      await expect(multiFaucet.connect(userB).updateFaucet(tokenA.address, 200)).to.be.revertedWith(
        'MultiFaucet: You are not the owner of this faucet'
      );
    });

    it('should remove a faucet', async () => {
      let faucetBalance = await tokenA.balanceOf(multiFaucet.address);
      expect(faucetBalance).to.equal(100);
      await multiFaucet.removeFaucet(tokenA.address);
      faucetBalance = await tokenA.balanceOf(multiFaucet.address);
      expect(faucetBalance).to.equal(0);
      const faucet = await multiFaucet.faucets(tokenA.address);
      expect(faucet[0]).to.equal(ethers.constants.AddressZero);
      expect(faucet[1]).to.equal(0);
    });

    it('should not remove the faucet if you are not the owner', async () => {
      await expect(multiFaucet.connect(userB).removeFaucet(tokenA.address)).to.be.revertedWith(
        'MultiFaucet: You are not the owner of this faucet'
      );
    });

    it('should request funds', async () => {
      const faucet = await multiFaucet.faucets(tokenA.address);
      await multiFaucet.connect(userB).requestFunds(tokenA.address);
      const userBalance = await tokenA.balanceOf(userB.address);
      expect(userBalance).to.equal(faucet[1]);
    });

    it('should throw error when a faucet does not have enough funds', async () => {
      await multiFaucet.connect(userB).requestFunds(tokenA.address);
      await expect(multiFaucet.connect(userB).requestFunds(tokenA.address)).to.be.revertedWith(
        'MultiFaucet: This faucet does not have enough funds'
      );
    });

    it('should throw error when a faucet does not exist', async () => {
      await expect(multiFaucet.connect(userB).requestFunds(tokenB.address)).to.be.revertedWith(
        'MultiFaucet: This faucet does not exist'
      );
    });
  });
});

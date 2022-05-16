import {HardhatUserConfig} from 'hardhat/config';
import * as dotenv from 'dotenv';

dotenv.config();

const networks: HardhatUserConfig['namedAccounts'] = {
  deployer: {
    default: 0, // here this will by default take the first account as deployer
  },
  proxyOwner: {
    default: 1, // here this will by default take the second account as feeCollector (so in the test this will be a different account than the deployer)
    // 1: '0x0', // on the mainnet the feeCollector could be a multi sig
  },
  swapRouter: {
    default: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    4: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // uniswap v3
    56: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // pancakeswap v2
    97: '0x3380aE82e39E42Ca34EbEd69aF67fAa0683Bb5c1', // apeswap v2 or 0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3 https://pancake.kiemtienonline360.com/
  },
  dai: {
    97: '0xec5dcb5dbf4b114c9d0f65bccab49ec54f6a0867',
    56: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc36',
  },
  usdc: {
    97: '0x64544969ed7EBf5f083679233325356EbE738930',
    56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  },
  usdt: {
    97: '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd',
    56: '0x55d398326f99059fF775485246999027B3197955',
  },
  busd: {
    97: '0x78867bbeef44f2326bf8ddd1941a4439382ef2a7',
    56: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  },
  btcb: {
    // BTC
    97: '0x6ce8da28e2f864420840cf74474eff5fd80e65b8',
    56: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  },
  eth: {
    97: '0xd66c6b4f0be8ce5b39d52e0fd1344c389929b378',
    56: '0x250632378E573c6Be1AC2f97Fcdf00515d0Aa91B',
  },
  xrp: {
    97: '0xa83575490d7df4e2f47b7d38ef351a2722ca45b9',
    56: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
  },
};

export default networks;

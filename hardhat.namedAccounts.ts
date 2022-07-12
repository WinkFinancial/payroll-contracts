import {HardhatUserConfig} from 'hardhat/config';
import * as dotenv from 'dotenv';

dotenv.config();

const networks: HardhatUserConfig['namedAccounts'] = {
  deployer: {
    default: 0, // here this will by default take the first account as deployer
  },
  feeAddress: {
    default: 0, // here this will by default take the first account as fee Address
  },
  proxyOwner: {
    default: 1, // here this will by default take the second account as feeCollector (so in the test this will be a different account than the deployer)
    1: 0,
    4: 0, // For testnet use first account
    56: 0,
    97: 0, // For testnet use first account
    40: 0,
    41: 0, // For testnet use first account
    30: 0,
    31: 0, // For testnet use first account
    137: 0,
    80001: 0, // For testnet use first account
  },
  swapRouter: {
    default: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    1: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // uniswap v3
    4: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // uniswap v3
    56: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // pancakeswap v2
    97: '0x3380aE82e39E42Ca34EbEd69aF67fAa0683Bb5c1', // apeswap v2 or 0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3 https://pancake.kiemtienonline360.com/
    40: '0xB9239AF0697C8efb42cBA3568424b06753c6da71', // zappy.finance v2
    41: '0xd03d102C9dfCE013eA4671B5c282D65Cf1eB1DC5', // demo.telos.finance v2
    30: '0xf55c496bb1058690DB1401c4b9C19F3f44374961', // rskswap v2
    31: '0xf55c496bb1058690DB1401c4b9C19F3f44374961', // rskswap v2
    137: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // quickswap.exchange v2
    80001: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // quickswap.exchange v2
  },
  jUSDT: {
    4: '0xd0CdDBee19A25D65B0D905F7053Fdd19947ab370',
    97: '0x863C2c19208aC736324e438DF9a49F39c3dbA843',
    41: '0x623F71f6d0339E4c639d7cA6303B54ACe40Be2aC',
    31: '0x8672aDF72de0a0650c4001aaD8083042A4D18E88',
    80001: '0x90596469bB8f8434FBb98c02B6E856e83a30AE78',
  },
  jWBTC: {
    4: '0x879947a97a662E8294aFD601a901383D7731484e',
    97: '0xCbBbdc113F480a83050C7Cd2420E100Cf6305858',
    41: '0xB34fc9b45dd1E2eADC78E25f81e57e14AdA94C92',
    80001: '0x988777898643893f44E4F086D8f747eEF21429E1',
  },
  jDAI: {
    4: '0x659b25Cbf47128BF952EFB97f27b0821F169A1E5',
    97: '0xD2E96745ddd7c6641866C9335909AeC605eF07A4',
    41: '0xC50C7a502e6aE874A6299f385F938aF5C30CB91d',
    31: '0x4ec48Cb892Fa8D66bF87A43A5583c748fe8c1613',
    80001: '0x88F6B2bC66f4c31a3669b9b1359524aBf79CfC4A',
  },
  isSwapRouterV2: {
    default: 'false',
    1: 'false',
    4: 'false',
    56: 'true',
    97: 'true',
    40: 'true',
    41: 'true',
    30: 'true',
    31: 'true',
    137: 'true',
    80001: 'true',
  },
};

export default networks;

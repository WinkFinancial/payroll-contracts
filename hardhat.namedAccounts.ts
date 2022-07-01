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
    137: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // quickswap.exchange v2
    80001: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // quickswap.exchange v2
  },
};

export default networks;

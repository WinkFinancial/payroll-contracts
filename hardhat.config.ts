/**
 * @type import('hardhat/config').HardhatUserConfig
 */
import * as dotenv from 'dotenv';

import {HardhatUserConfig} from 'hardhat/config';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'hardhat-contract-sizer';
import 'hardhat-deploy';
import 'hardhat-docgen';
import 'hardhat-abi-exporter';
import networks from './hardhat.network';

dotenv.config();

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  gasReporter: {
    currency: 'USD',
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
  },
  abiExporter: {
    runOnCompile: true,
    clear: true,
    flat: true,
    only: [':Payroll$'],
  },
  contractSizer: {
    runOnCompile: true,
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  namedAccounts: {
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
      97: '0x3380aE82e39E42Ca34EbEd69aF67fAa0683Bb5c1', // apeswap v2
    },
  },
  networks,
};

export default config;

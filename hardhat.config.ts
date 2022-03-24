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

dotenv.config();

let privKey = process.env.PRIV_KEY || '';
if (!privKey) {
  console.warn('\x1b[31m', 'Must add privKey to env file (No needed for testing only).');
  privKey = String('').padStart(64, '0');
}

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
      1: '0x0', // on the mainnet the feeCollector could be a multi sig
    },
  },
  networks: {
    rinkeby: {
      live: true,
      url: 'https://rinkeby.infura.io/v3/' + process.env.INFURA_API_KEY,
      blockGasLimit: 8000000,
      chainId: 4,
      hardfork: 'istanbul',
      accounts: [privKey],
      tags: ['staging'],
    },
  },
};

export default config;

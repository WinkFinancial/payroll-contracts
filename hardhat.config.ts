/**
 * @type import('hardhat/config').HardhatUserConfig
 */
import * as dotenv from 'dotenv';

import {HardhatUserConfig, task} from 'hardhat/config';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'hardhat-contract-sizer';
import 'hardhat-deploy';

dotenv.config();

let privKey = process.env.PRIV_KEY || '';
if (!privKey) {
  console.warn('\x1b[31m', 'Must add privKey to env file (No needed for testing only).');
}

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    compilers: [{version: '0.8.4', settings: {}}],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined && process.env.REPORT_GAS.toLowerCase() === 'true',
    currency: 'USD',
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
    swapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
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

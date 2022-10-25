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
import namedAccounts from './hardhat.namedAccounts';

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
    except: ['./test'],
  },
  abiExporter: {
    runOnCompile: true,
    clear: true,
    flat: true,
    only: [':Payroll$'],
  },
  contractSizer: {
    runOnCompile: false,
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY,
      rinkeby: process.env.ETHERSCAN_API_KEY,
      bsc: process.env.BSC_API_KEY,
      bscTestnet: process.env.BSC_API_KEY,
      polygonMumbai: process.env.POLY_API_KEY,
      polygon: process.env.POLY_API_KEY,
    },
  },
  namedAccounts,
  networks,
};

export default config;

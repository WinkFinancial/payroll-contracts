import {HardhatUserConfig} from 'hardhat/config';
import * as dotenv from 'dotenv';

dotenv.config();

const alchemyUrl = process.env.ALCHEMY_URL || '';
const infuraApiKey = process.env.INFURA_API_KEY;
const mnemonic = process.env.HDWALLET_MNEMONIC;
const forkEnabled = process.env.FORK_ENABLED || false;

const networks: HardhatUserConfig['networks'] = {
  localhost: {
    chainId: 1,
    url: 'http://127.0.0.1:8545',
    allowUnlimitedContractSize: true,
  },
};

if (forkEnabled) {
  networks.hardhat = {
    chainId: 1,
    forking: {
      url: alchemyUrl,
    },
    accounts: {
      mnemonic,
    },
  };
} else {
  networks.hardhat = {
    allowUnlimitedContractSize: true,
  };
}

if (mnemonic) {
  networks.bsc = {
    chainId: 56,
    url: 'https://bsc-dataseed.binance.org',
    accounts: {
      mnemonic,
    },
  };

  networks.bscTestnet = {
    chainId: 97,
    url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    accounts: {
      mnemonic,
    },
  };

  networks.matic = {
    chainId: 137,
    url: 'https://rpc-mainnet.maticvigil.com',
    accounts: {
      mnemonic,
    },
  };

  networks.mumbai = {
    chainId: 80001,
    url: 'https://rpc-mumbai.matic.today',
    accounts: {
      mnemonic,
    },
  };
}

if (infuraApiKey && mnemonic) {
  networks.kovan = {
    url: `https://kovan.infura.io/v3/${infuraApiKey}`,
    chainId: 42,
    accounts: {
      mnemonic,
    },
  };

  networks.ropsten = {
    url: `https://ropsten.infura.io/v3/${infuraApiKey}`,
    chainId: 3,
    accounts: {
      mnemonic,
    },
  };

  networks.rinkeby = {
    live: true,
    url: 'https://rinkeby.infura.io/v3/' + process.env.INFURA_API_KEY,
    blockGasLimit: 8000000,
    chainId: 4,
    hardfork: 'istanbul',
    accounts: {
      mnemonic,
    },
    tags: ['staging'],
  };

  networks.mainnet = {
    url: alchemyUrl,
    accounts: {
      mnemonic,
    },
  };
} else {
  console.warn('No infura or hdwallet available for testnets');
}

export default networks;

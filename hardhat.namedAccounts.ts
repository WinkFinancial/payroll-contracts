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
    default: 0,
    1337: 1, // here this will by default take the second account as feeCollector (so in the test this will be a different account than the deployer)
  },
  swapRouter: {
    default: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    1: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // uniswap v3
    4: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // uniswap v3
    5: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // uniswap v3
    56: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // pancakeswap v2
    97: '0x3380aE82e39E42Ca34EbEd69aF67fAa0683Bb5c1', // apeswap v2 or 0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3 https://pancake.kiemtienonline360.com/
    40: '0xB9239AF0697C8efb42cBA3568424b06753c6da71', // zappy.finance v2
    41: '0xd03d102C9dfCE013eA4671B5c282D65Cf1eB1DC5', // demo.telos.finance v2
    30: '0xf55c496bb1058690DB1401c4b9C19F3f44374961', // rskswap v2
    31: '0xf55c496bb1058690DB1401c4b9C19F3f44374961', // rskswap v2
    137: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // quickswap.exchange v2
    9000: '0x72bd489d3cF0e9cC36af6e306Ff53E56d0f9EFb4', // diffusion.fi v2
    9001: '0xFCd2Ce20ef8ed3D43Ab4f8C2dA13bbF1C6d9512F', // diffusion.fi v2
    80001: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // quickswap.exchange v2
    42220: '0x1421bDe4B10e8dd459b3BCb598810B1337D56842', // sushiswap v2
    44787: '0xE3D8bd6Aed4F159bc8000a9cD47CffDb95F96121', //ubeswap v2 https://app-alfajores.ubeswap.org/#/swap
    4689: '0x95cb18889b968ababb9104f30af5b310bd007fd8', // Mimo v2
    4690: '0x95cb18889b968ababb9104f30af5b310bd007fd8', // Mimo v2
  },
  jUSDT: {
    4: '0xd0CdDBee19A25D65B0D905F7053Fdd19947ab370',
    5: '0xD84B87568C215f7d03D9bc1B05D106028498Dc8e',
    97: '0x863C2c19208aC736324e438DF9a49F39c3dbA843',
    41: '0x623F71f6d0339E4c639d7cA6303B54ACe40Be2aC',
    31: '0x8672aDF72de0a0650c4001aaD8083042A4D18E88',
    9000: '0x5D6A72B51D5702A339C85CA9eB88914CA8b555cc',
    80001: '0x90596469bB8f8434FBb98c02B6E856e83a30AE78',
    44787: '0xe2EBFC705d473C3dDd52CB49AF0bdE3132E8831e',
    4690: '0x7aEc56b782c593b312a8c33eeFd8e50eEf975980',
  },
  jWBTC: {
    4: '0x879947a97a662E8294aFD601a901383D7731484e',
    5: '0xd76715fc071e5020A71ec48C2E9260C492e95Dd7',
    97: '0xCbBbdc113F480a83050C7Cd2420E100Cf6305858',
    41: '0xB34fc9b45dd1E2eADC78E25f81e57e14AdA94C92',
    9000: '0xf508585DF344C140B7a7E9bae540E054Cae82De8',
    80001: '0x988777898643893f44E4F086D8f747eEF21429E1',
    44787: '0xC71b05ba6A163aC512A920e81ef795E5b105448d',
    4690: '0xAC42761C37d4467ff69082249B9E67D6b35d50cb',
  },
  jDAI: {
    4: '0x659b25Cbf47128BF952EFB97f27b0821F169A1E5',
    5: '0x13BFE45D0D0f605b020fb62Cc5dd154b62D22d67',
    97: '0xD2E96745ddd7c6641866C9335909AeC605eF07A4',
    41: '0xC50C7a502e6aE874A6299f385F938aF5C30CB91d',
    31: '0x4ec48Cb892Fa8D66bF87A43A5583c748fe8c1613',
    9000: '0x623F71f6d0339E4c639d7cA6303B54ACe40Be2aC',
    80001: '0x88F6B2bC66f4c31a3669b9b1359524aBf79CfC4A',
    44787: '0xb3D06103af1A68026615E673d46047FAB77DB0Fa',
    4690: '0x8c1901c031Cdf42a846c0C422A3B5A2c943F4944',
  },
  isSwapRouterV2: {
    default: '0x0000000000000000000000000000000000000001', // true only adresses allowed here
    1: '0x0000000000000000000000000000000000000000', // false only adresses allowed here
    4: '0x0000000000000000000000000000000000000000',
    5: '0x0000000000000000000000000000000000000000',
  },
};

export default networks;

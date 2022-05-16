import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const version = 'v0.2.0';
const contractName = 'Payroll';

const UNISWAP_V3_CHAINS = [1, 3, 4, 5, 42]; // Ethereum and it's testnets

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    const {deployments, getNamedAccounts, network} = hre;
    const chainId = network.config.chainId || 0;

    const {deploy} = deployments;

    const {deployer, swapRouter} = await getNamedAccounts();

    const isSwapV2 = UNISWAP_V3_CHAINS.indexOf(chainId) === -1 ? true : false;

    const deployResult = await deploy(contractName, {
      from: deployer,
      proxy: {
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          init: {
            methodName: 'initialize',
            args: [swapRouter, isSwapV2],
          },
        },
      },
      gasLimit: 4000000,
      log: true,
    });

    if (deployResult.newlyDeployed) {
      if (network.live) {
        console.log(`Startig Verification of Payroll_Implementation ${deployResult.implementation}`);
        await hre.run('verify:verify', {
          address: deployResult.implementation,
        });
      }
    }

    return true;
  }

  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  await main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const id = contractName + version;

export default func;
func.tags = [contractName, version];
func.id = id;

import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {verifyContract} from '../utils/verifyContract';
const version = 'v0.2.0';
const contractName = 'Payroll';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    console.log(`Deploying ${contractName} ${version}`);
    const {deployments, getNamedAccounts, network, ethers} = hre;

    const {deploy} = deployments;

    const {deployer, feeAddress, swapRouter, isSwapRouterV2} = await getNamedAccounts();
    const isSwapV2 = isSwapRouterV2 !== ethers.constants.AddressZero ? true : false
    const fee = 0;

    const deployResult = await deploy(contractName, {
      from: deployer,
      proxy: {
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          init: {
            methodName: 'initialize',
            args: [swapRouter, isSwapV2, feeAddress, fee],
          },
        },
      },
      gasLimit: 4000000,
      log: true,
    });

    await verifyContract(network, deployResult, contractName);

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
func.tags = [contractName, version, 'Payroll', 'upgrade'];
func.id = id;

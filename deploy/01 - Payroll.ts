import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {isIoTeX, verifyContract} from '../utils/verifyContract';
const version = 'v0.2.0';
const deployName = 'Payroll';
let contractName = 'Payroll';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    console.log(`Deploying ${deployName} ${version}`);
    const {deployments, getNamedAccounts, network, ethers} = hre;

    const {deploy} = deployments;

    const {deployer, feeAddress, swapRouter, isSwapRouterV2} = await getNamedAccounts();
    const isSwapV2 = isSwapRouterV2 !== ethers.constants.AddressZero ? true : false;
    const fee = 0;

    if (isIoTeX(network)) {
      // Iotex uses Mimo that has a slightly different ABI than uniswap https://iotexscan.io/address/0x95cb18889b968ababb9104f30af5b310bd007fd8#code
      // that's why we used a modified version of Payroll contract
      contractName = 'PayrollIotex';
    }
    console.log(`Use contract ${contractName}`);

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

const id = deployName + version;

export default func;
func.tags = [deployName, version, 'upgrade'];
func.id = id;

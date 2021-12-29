import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

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

    const {deployments, getNamedAccounts} = hre;

    const {deploy} = deployments;

    const {deployer, proxyOwner} = await getNamedAccounts();

    await deploy(contractName, {
      contract: contractName,
      from: deployer,
      proxy: {
        owner: proxyOwner,
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [deployer],
        },
      },
      log: true,
    });

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
func.tags = [id, version];
func.id = id;
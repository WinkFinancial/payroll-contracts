import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import { verifyContract } from '../utils/verifyContract';

const version = 'v0.2.0';
const contractName = 'Token';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    const {deployments, getNamedAccounts, network} = hre;
    if (!network.live) return;
    if (!network.tags['staging']) return;
    console.log(`Deploying ${contractName} ${version}`);

    const {deploy} = deployments;

    const {deployer, jUSDT, jDAI, jWBTC} = await getNamedAccounts();

    const deployJToken = async (symbol: string) => {
      console.log(`Deploying ${symbol}`);
      const constructorArguments = [symbol, symbol];
      const deployResult = await deploy(symbol, {
        contract: contractName,
        from: deployer,
        args: constructorArguments,
        gasLimit: 2000000,
        log: true,
      });

      await verifyContract(deployResult, symbol, constructorArguments)
    };

    if (!jUSDT) {
      await deployJToken('jUSDT');
    }
    if (!jDAI) {
      await deployJToken('jDAI');
    }
    if (!jWBTC) {
      await deployJToken('jWBTC');
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

import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {verifyContract} from '../utils/verifyContract';

const version = 'v0.1.0';
const contractName = 'MultiFaucet';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    const {deployments, getNamedAccounts, network, ethers} = hre;
    if (!network.live) return;
    if (!network.tags['staging']) return;

    console.log(`Deploying ${contractName} ${version}`);

    const {deploy} = deployments;

    const {deployer} = await getNamedAccounts();

    const deployResult = await deploy(contractName, {
      contract: contractName,
      from: deployer,
      gasLimit: 2000000,
      log: true,
    });

    const faucet = await ethers.getContractAt(deployResult.abi, deployResult.address);

    const addToFaucetJToken = async (symbol: string) => {
      console.log(`Adding to Faucet ${symbol}`);
      const deployed = await deployments.get(symbol);
      const instance = await ethers.getContractAt(deployed.abi, deployed.address);
      await instance.transfer(faucet.address, ethers.utils.parseUnits('100000', 'ether'));
      const faucetInfo = await faucet.faucets(instance.address);
      if (faucetInfo.owner === ethers.constants.AddressZero) {
        await faucet.addFaucet(instance.address, ethers.utils.parseUnits('1000', 'ether'));
      }
    };

    await addToFaucetJToken('jUSDT');
    await addToFaucetJToken('jDAI');
    await addToFaucetJToken('jWBTC');

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
func.tags = [contractName, version, 'MultiFaucet'];
func.dependencies = ['JToken'];
func.id = id;

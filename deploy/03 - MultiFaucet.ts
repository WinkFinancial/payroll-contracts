import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

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

    const {deployments, getNamedAccounts, network} = hre;
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

    console.log("hola")

    if (deployResult.newlyDeployed && deployResult.transactionHash) {
      const blocks = 5;
      console.log(`Waiting ${blocks} blocks before verifying`);
      await hre.ethers.provider.waitForTransaction(deployResult.transactionHash, blocks);
      try {
        console.log(`Startig Verification of MultiFaucet_Implementation ${deployResult.address}`);
        await hre.run('verify:verify', {
          address: deployResult.address,
        });
      } catch (err: any) {
        if (err.message.includes('Already Verified')) {
          return;
        }
        throw err;
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

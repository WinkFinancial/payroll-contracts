import {ethers, run} from 'hardhat';
import {DeployResult} from 'hardhat-deploy/types';
import {Network} from 'hardhat/types';

export type TaskArgs = {
  address: string;
  constructorArguments?: string[];
};

export const verifyContract = async (
  network: Network,
  deployResult: DeployResult,
  contractName: string,
  constructorArguments?: string[]
) => {
  if (network.live && network.name !== 'rsk' && deployResult.newlyDeployed && deployResult.transactionHash) {
    const blocks = 5;
    const address = deployResult.implementation || deployResult.address;
    const taskArgs: TaskArgs = {address};
    if (constructorArguments) taskArgs.constructorArguments = constructorArguments;

    console.log(`Waiting ${blocks} blocks before verifying`);
    await ethers.provider.waitForTransaction(deployResult.transactionHash, blocks);
    try {
      console.log(`Startig Verification of ${contractName} ${address}`);
      await run('verify:verify', taskArgs);
    } catch (err: any) {
      if (err.message.includes('Already Verified')) {
        return;
      }
      throw err;
    }
  }
};

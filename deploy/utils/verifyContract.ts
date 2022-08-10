import {ethers, run} from 'hardhat';
import {DeployResult} from 'hardhat-deploy/types';

export type TaskArgs = {
  address: string;
  constructorArguments?: string[];
};

export const verifyContract = async (deployResult: DeployResult, constructorArguments?: string[]) => {
  if (deployResult.newlyDeployed && deployResult.transactionHash) {
    const blocks = 5;
    const address = deployResult.implementation || deployResult.address;
    const taskArgs: TaskArgs = {address};
    if (constructorArguments) taskArgs.constructorArguments = constructorArguments;

    console.log(`Waiting ${blocks} blocks before verifying`);
    await ethers.provider.waitForTransaction(deployResult.transactionHash, blocks);
    try {
      console.log(`Startig Verification of Payroll_Implementation ${address}`);
      await run('verify:verify', taskArgs);
    } catch (err: any) {
      if (err.message.includes('Already Verified')) {
        return;
      }
      throw err;
    }
  }
};

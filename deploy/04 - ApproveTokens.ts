import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {tokensByChainId} from '@wink-financial/wink-assets';
import {isIoTeX} from '../utils/verifyContract';

const version = 'v0.2.0';
const contractName = 'Payroll';
const action = 'Approve';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    const {deployments, network, ethers} = hre;

    if (!network.live) return;
    console.log(`Approving ${contractName} ${version}`);

    const chainId = network.config.chainId || 0;
    const tokens = tokensByChainId[chainId] || [];

    const tokensToApprove = tokens
      .filter((x) => x.address && x.address !== ethers.constants.AddressZero)
      .map((x) => x.address);
    if (!tokensToApprove.length) {
      console.log('No tokens to approve');
      return;
    }
    const payrollName = isIoTeX(network) ? 'PayrollIotex' : 'Payroll';
    const Payroll = await deployments.get(payrollName);
    const instance = await ethers.getContractAt(Payroll.abi, Payroll.address);
    await instance.approveTokens(tokensToApprove);
    console.log('Approved Tokens');
  }

  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  await main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const id = contractName + action + version;

export default func;
func.tags = [contractName + action, version, 'approve'];
func.id = id;
func.dependencies = [contractName];

import {BigNumber} from 'ethers';
import {tokensByChainId,networksByChainId} from '@wink-financial/wink-assets';
import hre from 'hardhat';

const version = 'v0.2.0';
const contractName = 'Payroll';

const func = async () => {
  async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    await hre.run('compile');

    console.log(`Verifying tokens approved ${contractName} ${version}`);
    const {network, ethers, deployments} = hre;

    const chainId = network.config.chainId || 0;
    const tokens = tokensByChainId[chainId] || [];

    const {routerAddress} = networksByChainId[chainId];

    // Add more tokens...
    // tokens.push(IToken);

    const payroll = await deployments.get('Payroll');

    console.log(`Verifying allowance...
      payroll: ${payroll.address}
      router: ${routerAddress}
      network: ${network.name}`);

    await Promise.all(
      tokens.map(async (token) => {
        if (token.address === ethers.constants.AddressZero || !token.enabled) {
          return;
        }

        const tokenContract = await ethers.getContractAt('Token', token.address);
        const amountApproved: BigNumber = await tokenContract.allowance(payroll.address, routerAddress);

        if (amountApproved.isZero()) {
          console.log(`Token ${token.symbol} - ${token.address} has no allowance`);
        } else {
          console.log(`Token ${token.symbol} - ${token.address} OK`);
        }
      })
    );

    console.log(`Done!`);

    return true;
  }

  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  await main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

func();

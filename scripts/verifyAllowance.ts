import {BigNumber} from 'ethers';
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
    const {getNamedAccounts, network, ethers, deployments} = hre;

    const {dai, usdc, usdt, busd, btcb, eth, xrp, jUSDT, jWBTC, jDAI, swapRouter} = await getNamedAccounts();
    const tokens = [dai, usdc, usdt, busd, btcb, eth, xrp, jUSDT, jWBTC, jDAI];
    const tokensToApprove = tokens.filter((x) => !!x);

    // Add more tokens...
    // tokensToApprove.push('0x761D38e5ddf6ccf6Cf7c55759d5210750B5D60F3');

    const payroll = await deployments.get('Payroll');
    const routerAddress = swapRouter;

    console.log(`Verifying allowance...
      payroll: ${payroll.address}
      router: ${routerAddress}
      network: ${network.name}`);

    await Promise.all(
      tokensToApprove.map(async (tokenAddress) => {
        const token = await ethers.getContractAt('Token', tokenAddress);

        const amountApproved: BigNumber = await token.allowance(payroll.address, routerAddress);

        if (amountApproved.isZero()) {
          console.log(`Token ${tokenAddress} has no allowance`);
        } else {
          console.log(`Token ${tokenAddress} OK`);
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

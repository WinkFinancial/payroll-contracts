import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

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

    console.log(`Approving ${contractName} ${version}`);
    const {deployments, getNamedAccounts, network, ethers} = hre;

    if (network.live) {
      const {dai, usdc, usdt, busd, btcb, eth, xrp, jUSDT, jWBTC, jDAI, wbnb, wbtc, ada, doge, shiba, link, uni} =
        await getNamedAccounts();
      const tokens = [
        dai,
        usdc,
        usdt,
        busd,
        btcb,
        eth,
        xrp,
        jUSDT,
        jWBTC,
        jDAI,
        wbnb,
        wbtc,
        ada,
        doge,
        shiba,
        link,
        uni,
      ];
      const tokensToApprove = tokens.filter((x) => !!x);

      const Payroll = await deployments.get('Payroll');
      const instance = await ethers.getContractAt(Payroll.abi, Payroll.address);
      await instance.approveTokens(tokensToApprove);
      console.log('Approved Tokens');
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

const id = contractName + action + version;

export default func;
func.tags = [contractName + action, version];
func.id = id;
func.dependencies = [contractName];

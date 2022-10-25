import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {BigNumber} from 'ethers';

const version = 'v0.1.0';
const contractName = 'AddLiquidity';

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

    console.log(`Adding Liquidity ${version}`);

    const {deployer, swapRouter, isSwapRouterV2} = await getNamedAccounts();
    const isSwapV2 = isSwapRouterV2 !== ethers.constants.AddressZero ? true : false;

    if (!isSwapV2) {
      console.log(`Not swap V2`);
      return true;
    }

    const swapRouterContract = await ethers.getContractAt('IUniswapV2', swapRouter);
    const factoryAddress = await swapRouterContract.factory();
    const factory = await ethers.getContractAt('IUniswapV2Factory', factoryAddress);

    const addLiquidity = async (symbolA: string, symbolB: string, amountA: BigNumber, amountB: BigNumber) => {
      console.log(`Creating Pair ${symbolA}/${symbolB}`);
      const deployedA = await deployments.get(symbolA);
      const deployedB = await deployments.get(symbolB);
      const pairAddress = await factory.getPair(deployedA.address, deployedB.address);
      if (pairAddress !== ethers.constants.AddressZero) {
        console.log(`Already exists pair ${symbolA}/${symbolB}`);
        return true;
      }
      const instanceA = await ethers.getContractAt(deployedA.abi, deployedA.address);
      const instanceB = await ethers.getContractAt(deployedB.abi, deployedB.address);
      await instanceA.approve(swapRouter, ethers.constants.MaxUint256);
      await instanceB.approve(swapRouter, ethers.constants.MaxUint256);
      const timestamp = Date.now() + 1000 * 60 * 60;
      const deadline = Math.floor(timestamp / 1000);
      console.log('Before adding liquidity');
      await swapRouterContract.addLiquidity(
        deployedA.address,
        deployedB.address,
        amountA,
        amountB,
        amountA.sub(1),
        amountB.sub(1),
        deployer,
        deadline,
        {
          gasLimit: 1500000,
        }
      );
    };

    await addLiquidity(
      'jUSDT',
      'jDAI',
      ethers.utils.parseUnits('10000000', 'ether'),
      ethers.utils.parseUnits('10000000', 'ether')
    );
    await addLiquidity(
      'jUSDT',
      'jWBTC',
      ethers.utils.parseUnits('2000000', 'ether'),
      ethers.utils.parseUnits('100', 'ether')
    );
    await addLiquidity(
      'jDAI',
      'jWBTC',
      ethers.utils.parseUnits('2000000', 'ether'),
      ethers.utils.parseUnits('100', 'ether')
    );

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
func.tags = [contractName, version, 'AddLiquidity'];
func.dependencies = ['JToken'];
func.id = id;

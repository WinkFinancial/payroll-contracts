import hardhat from 'hardhat';

async function contractCall(args: any, from: string) {
  const {ethers, deployments, network} = hardhat as any;

  const Payroll = await deployments.get('Payroll');
  let instance = await ethers.getContractAt(Payroll.abi, Payroll.address);
  const providerWithoutSigner = new ethers.providers.StaticJsonRpcProvider(network.config.url);
  instance = instance.connect(providerWithoutSigner);
  const result = await instance.callStatic.performSwapV2AndPayment(
    args._erc20TokenOrigin,
    args._totalAmountToSwap,
    args._deadline,
    args._swaps,
    args._payments,
    {from}
  );
  console.log('==== Success ====== result:', result);
}

const args = {
  _erc20TokenOrigin: '0x55d398326f99059fF775485246999027B3197955',
  _totalAmountToSwap: '420000000000000000000',
  _deadline: 1754112982,
  _swaps: [
    {
      amountOut: '26949298292513050',
      amountInMax: '52500000000000000000',
      path: ['0x55d398326f99059fF775485246999027B3197955', '0x2170Ed0880ac9A755fd29B2688956BD959F933F8'],
    },
    {
      amountOut: '149148826402577969250',
      amountInMax: '157500000000000000000',
      path: ['0x55d398326f99059fF775485246999027B3197955', '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'],
    },
  ],
  _payments: [
    {
      token: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
      receivers: ['0xd9cf95B08B87a8fE49Da81c93F58b80256BE5639'],
      amountsToTransfer: ['26949298292513050'],
    },
    {
      token: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      receivers: ['0xd9cf95B08B87a8fE49Da81c93F58b80256BE5639', '0x62c751F207517c7f0f4f86720Be4e4368f519d67'],
      amountsToTransfer: ['49716275467525989750', '99432550935051979500'],
    },
    {
      token: '0x55d398326f99059fF775485246999027B3197955',
      receivers: ['0x92f2c7902ee8A17b94B3EdB29d0351a6A1BD5729', '0x82732eCa78474A772799b341100098F05464c401'],
      amountsToTransfer: ['100000000000000000000', '100000000000000000000'],
    },
  ],
};
const from = '0xf46a3e7007d55ae6ee4e3bd8d80313537e54e0c5';
contractCall(args, from);

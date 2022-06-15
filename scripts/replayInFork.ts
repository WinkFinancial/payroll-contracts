import hre, {ethers} from 'hardhat';
import { Token } from '../typechain-types';
import {PaymentStruct, SwapV2Struct, Payroll} from '../typechain-types/Payroll';

async function main() {
  const payerAddress = '0xf46A3E7007D55ae6ee4E3bD8D80313537e54e0c5';
  const payrollContract = '0xe2EBFC705d473C3dDd52CB49AF0bdE3132E8831e';

  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [payerAddress],
  });

  const payer = ethers.provider.getSigner(payerAddress);

  const payroll: Payroll = await ethers.getContractAt(`Payroll`, payrollContract);
  const token: Token = await ethers.getContractAt('Token', '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d');

  const swaps: SwapV2Struct[] = [
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
  ];

  const payments: PaymentStruct[] = [
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
  ];

  console.log('balance before ', (await token.balanceOf('0x62c751F207517c7f0f4f86720Be4e4368f519d67')).toString())

  await payroll
    .connect(payer)
    .performSwapV2AndPayment(
      '0x55d398326f99059fF775485246999027B3197955',
      '420000000000000000000',
      '1654112982',
      swaps,
      payments
    );

  console.log('balance after ', (await token.balanceOf('0x62c751F207517c7f0f4f86720Be4e4368f519d67')).toString())
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


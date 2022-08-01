// eslint-disable-next-line
const TronWeb = require('tronweb');
// eslint-disable-next-line
const abi = require('../abi/Payroll.json');

const getTronWeb = () => {
  return new TronWeb({
    fullHost: 'https://api.shasta.trongrid.io',
    eventServer: 'https://api.shasta.trongrid.io',
    privateKey: '',
  });
};

const payrollAddress = 'TD1o2DV6E5iXu2dPbu1nFPRozbqNEtiBP4';

const USDT = 'TSsjPxRVQxN5CKk59Gfxyme5vhgp3ymSKq';
const ADA = 'TTMuLqv8eLSVUbdR8U6rPH99HZKGAfX7J2';

const swaps = [['1006967980', '2200000000000000000000', [USDT, ADA]]];

const payments = [
  [
    USDT,
    ['TBFQ6CDifCA3wMPG2jGDCDpcP8oGvEoiV3', 'TR33WVeGWp5y6Z2xt1F5dgqjBrTzeYqF1n'],
    ['1534235000000000000000', '2356670000000000000000'],
  ],
  [ADA, ['TBFQ6CDifCA3wMPG2jGDCDpcP8oGvEoiV3', 'TR33WVeGWp5y6Z2xt1F5dgqjBrTzeYqF1n'], ['498499000', '498499000']],
];

const totalAmountToSwap = '2200000000000000000000';

const timestamp = Date.now() + 1000 * 60 * 60;
const deadline = Math.floor(timestamp / 1000);

const init = async () => {
  const tronWeb = getTronWeb();
  const contract = await tronWeb.contract(abi, payrollAddress);
  const myAddress = tronWeb.defaultAddress.base58;
  console.log('My address: ', myAddress);

  try {
    const data = await contract.methods
      .performSwapV2AndPayment(USDT, totalAmountToSwap, deadline, swaps, payments)
      .send();

    console.log(data);
  } catch (error) {
    console.log('error', error);
  }
};

init();

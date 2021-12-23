/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require('hardhat-contract-sizer');
require('hardhat-deploy');

module.exports = {
  solidity: "0.8.4",
  gasReporter: {
    enabled:
      process.env.REPORT_GAS !== undefined &&
      process.env.REPORT_GAS.toLowerCase() === "true",
    currency: "USD",
  },
  contractSizer: {
    runOnCompile: true,
  }
};

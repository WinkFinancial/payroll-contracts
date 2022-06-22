module.exports = {
  norpc: true,
  testCommand: 'yarn test',
  compileCommand: 'yarn compile',
  skipFiles: ['mocks', 'test', 'interfaces', 'BytesLib.sol'],
  mocha: {
    fgrep: '[skip-on-coverage]',
    invert: true,
  },
};

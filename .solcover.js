module.exports = {
  norpc: true,
  testCommand: 'yarn test',
  compileCommand: 'yarn compile',
  skipFiles: ['mocks', 'test', 'interfaces'],
  mocha: {
    fgrep: '[skip-on-coverage]',
    invert: true,
  },
};

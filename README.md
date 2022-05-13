# Payroll
Multiple payments and swaps in one transaction


## Pre requisits
You will need nodejs version 16 https://nodejs.dev/
And yarn https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable


Create .env using the .env.example and replace for the corresponding values
```sh
cp .env.example .env
```

Then, proceed with installing dependencies:

```sh
yarn install
```

## Development

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

Linting (EsLint and Solhint)

```sh
$ yarn lint
```

Generate Documentation

```sh
$ yarn docgen
```


### Test

Run the Mocha tests:

```sh
$ yarn test
```

Run coverage tests:

```sh
$ yarn coverage
```

### Slither
Slither is a source code analyser for solidity, it runs a suite of vulnerability detectors, prints visual information about contract details.
First install it using https://github.com/crytic/slither#how-to-install

Then run
```sh
$ slither .
```

## Deploy

Deploy the contracts to Hardhat Network:

```sh
$ yarn deploy network hardhat
```

Deploy the contracts to biannce testnet Network:

```sh
$ yarn deploy network bscTestnet
```


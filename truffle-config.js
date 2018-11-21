require('dotenv').config();
require('babel-register')();
require('babel-polyfill');

const HDWalletProvider = require('truffle-hdwallet-provider');

const {
  SOLIDITY_COVERAGE: useSolcover,
  GAS_REPORTER: useGasReporter,
  TRUFFLE_TEST: isTest,
  TEST_MNEMONIC: testMnemonic,
  MNEMONIC: mnemonic,
  INFURA_API_KEY: infuraApiKey,
} = process.env;

const getProvider = (
  providerUrl,
  addressIndex = 0,
  numAddresses = 10
) => !useSolcover
  ? () => new HDWalletProvider(isTest ? testMnemonic : mnemonic, providerUrl, addressIndex, numAddresses)
  : undefined; // https://github.com/sc-forks/solidity-coverage/blob/master/docs/faq.md#using-alongside-hdwalletprovider

const devProvider = getProvider('http://localhost:8545');
const testnetProvider = getProvider(`https://ropsten.infura.io/${infuraApiKey}`);

const mocha = useGasReporter
  ? {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: 'KRW',
      gasPrice: 5,
    },
  }
  : undefined;

module.exports = {
  networks: {
    coverage: {
      host: 'localhost',
      port: 8555,
      network_id: '*', // eslint-disable-line camelcase
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    rpc: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // eslint-disable-line camelcase
    },
    development: {
      host: 'localhost',
      port: 8545,
      provider: devProvider,
      gas: 4712388,
      gasPrice: 1,
      network_id: '*', // eslint-disable-line camelcase
    },
    ropsten: {
      provider: testnetProvider,
      network_id: 3, // eslint-disable-line camelcase
      gas: 4600000,
    },
  },
  solc: {
    optimizer: {
      // disabled by default
      enabled: true,
      // Optimize for how many times you intend to run the code.
      // Lower values will optimize more for initial deployment cost, higher values will optimize more for high-frequency usage.
      runs: 200,
    },
  },
  mocha,
};

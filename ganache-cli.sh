#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganache instance that we started (if we started one and if it's still running).
  if [ -n "$ganache_pid" ] && ps -p $ganache_pid > /dev/null; then
    kill -9 $ganache_pid
  fi
}

if [ "$SOLIDITY_COVERAGE" = true ]; then
  ganache_port=8555
else
  ganache_port=8545
fi

ganache_running() {
  nc -z localhost "$ganache_port"
}

start_ganache() {
  # We define 10 accounts with balance 1M ether from `$TEST_MNEMONIC` m/44'/60'/0'/0/0~9, needed for high-value and signature tests.
  local accounts=(
    --account="0x26aa1c7601761ce0399cd593644ec1e53c67b24e88e5e3f152730a6128e859a5,1000000000000000000000000"
    --account="0x4ddea77332d595b63334639d52cb4c9700c0049a2b4fc09729118e7b2991f559,1000000000000000000000000"
    --account="0x95b7edc6cd9051639bf6c0f6717cd835356ed6fffeaee6a4b4facaf9d70b20fc,1000000000000000000000000"
    --account="0xfcf5c38596986ea4d54fc737e8fc9e42cc0b78a16d1aab8f4de9d08d52c3ad40,1000000000000000000000000"
    --account="0xb43422181730e59a7423de6c8f81d1e1a29125e6500a5e29b0c7a1336f3d0d9f,1000000000000000000000000"
    --account="0xee33b17b2196221fece8d93add3487cdecca1b5111e4ebe9988ed1461cef9d9d,1000000000000000000000000"
    --account="0x672be0c7ba235af3730cb2707b45436fa15f7f60eedd0fb0ead43b4d14a6127e,1000000000000000000000000"
    --account="0xac247c07cfb57b825fdc5df59432699eda7052bc93dc2ffae39aa480233bc632,1000000000000000000000000"
    --account="0x7867ccb7dd93e0c7ed9b7e10e64c5ac027ac1149d5180ad1ebab60c84c94aadc,1000000000000000000000000"
    --account="0x721118e9d8e80559e0ca92d136d337bad5d36e66c1844d61a398b0c46f9842ca,1000000000000000000000000"
  )

  if [ "$SOLIDITY_COVERAGE" = true ]; then
    if [ -e node_modules/.bin/testrpc-sc ]; then
      echo "npm installed"
      # If you installed using npm
      node_modules/.bin/testrpc-sc --gasLimit 0xfffffffffff --port "$ganache_port" "${accounts[@]}" > /dev/null &
    else
      # If you installed using yarn
      echo "yarn installed"
      node_modules/ethereumjs-testrpc-sc/build/cli.node.js  --gasLimit 0xfffffffffff --port "$ganache_port" "${accounts[@]}" > /dev/null &
    fi
  else
    node_modules/.bin/ganache-cli --gasLimit 0xfffffffffff "${accounts[@]}" > /dev/null &
  fi
  ganache_pid=$!
}

if ganache_running; then
  echo "Using existing ganache instance"
else
  echo "Starting our own ganache instance"
  start_ganache
fi

if [ "$SOLC_NIGHTLY" = true ]; then
  echo "Downloading solc nightly"
  wget -q https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/soljson-nightly.js -O /tmp/soljson.js && find . -name soljson.js -exec cp /tmp/soljson.js {} \;
fi

if [ "$SOLIDITY_COVERAGE" = true ]; then
  node_modules/.bin/solidity-coverage

  if [ "$CONTINUOUS_INTEGRATION" = true ]; then
    cat coverage/lcov.info | node_modules/.bin/coveralls
  fi
else
  node_modules/.bin/truffle test --reset --network rpc "$@"
fi
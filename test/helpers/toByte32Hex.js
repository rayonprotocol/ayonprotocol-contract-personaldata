module.exports = function toByte32Hex (stringOrNumber) {
  return web3.toHex(stringOrNumber).padEnd(64 + 2, 0);
};


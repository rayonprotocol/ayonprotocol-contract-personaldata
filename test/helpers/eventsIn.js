/**
 * extract events(name and args) from tx receipt
 * @param {Promise} txPromise transaction promise
 * @returns {Promise<Array<{ name: string, args: object }>>}
 */
const eventsIn = async txPromise => {
  const { logs } = await txPromise;
  return logs.map(log => ({ name: log.event, args: log.args }));
};

export default eventsIn;

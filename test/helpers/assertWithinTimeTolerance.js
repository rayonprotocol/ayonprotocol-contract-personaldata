const BigNumber = web3.BigNumber;
/**
 * - A helper adding an assertion method `withinTimeTolerance`.
 * - Usage of assertion
 *  - actualTime.shoud.be.withinTimeTolerance(expectedTime); // with default(1 sec) tolerance
 *  - actualTime.shoud.be.withinTimeTolerance(expectedTime, 2); // with 2 sec tolerance
 * @param {*} chai
 * @param {*} utils
 */
export default function assertWithinTimeTolerance (chai, utils) {
  const Assertion = chai.Assertion;
  Assertion.addMethod('withinTimeTolerance',
    /**
     * assert time for block within small tolerance
     * @param expectedTime
     * @param tolerance tolerance time in seconds (default: 1 second)
     */
    function (expected, tolerance = 1) {
      const actual = this._obj;
      this.assert(typeof actual === 'number' || actual instanceof BigNumber, 'actual #{act} must be a number or BigNumber instance');
      this.assert(typeof expected === 'number' || expected instanceof BigNumber, 'expected #{exp} must be a number or BigNumber instance', null, expected);
      const actualTime = Number(actual);
      const expectedTime = Number(expected);
      actualTime.should.be.within(expectedTime - tolerance, expectedTime + tolerance);
    }
  );
};

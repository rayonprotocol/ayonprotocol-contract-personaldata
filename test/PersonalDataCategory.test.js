import { latestTime } from 'openzeppelin-solidity/test/helpers/latestTime';
import eventsIn from './helpers/eventsIn';
import assertWithinTimeTolerance from './helpers/assertWithinTimeTolerance';

const PersonalDataCategory = artifacts.require('./PersonalDataCategory.sol');
const BorrowerApp = artifacts.require('./BorrowerAppMock.sol');
const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .use(require('chai-as-promised'))
  .use(assertWithinTimeTolerance)
  .should();

const contractVersion = 1;

const range = (size) => [...Array(size instanceof BigNumber ? size.toNumber() : size)]
  .map((_, index) => index);

const REWARD_CYCLE = {
  DAILY: new BigNumber(0),
  WEEKLY: new BigNumber(1),
  MONTHLY: new BigNumber(2),
  ANNUALLY: new BigNumber(3),
};
const MAX_UINT8 = Math.pow(2, 8) - 1;
const MAX_REWARD_CYCLE = REWARD_CYCLE.ANNUALLY.toNumber();
const getInvalidRewardCycle = () => new BigNumber(
  MAX_REWARD_CYCLE + 1 + ~~(Math.random() * (MAX_UINT8 - MAX_REWARD_CYCLE - 1))
);

contract('PersonalDataCategory', function (accounts) {
  const [
    someBorrowerApp, otherBorrowerApp,
    nonOwner, owner,
  ] = accounts;

  let personalDataCategory, borrowerApp;

  const somePDC = {
    code: new BigNumber(200),
    category1: 'thing',
    category2: 'electronics',
    category3: 'computer',
    borrowerAppId: someBorrowerApp,
    score: new BigNumber(100),
    rewardCycle: REWARD_CYCLE.WEEKLY,
  };

  const otherPDC = {
    code: new BigNumber(300),
    category1: 'things',
    category2: 'transporter',
    category3: 'car',
    borrowerAppId: otherBorrowerApp,
    score: new BigNumber(200),
    rewardCycle: REWARD_CYCLE.ANNUALLY,
  };

  const mockSomeBorrowerAppExistence = () => borrowerApp.mockSetContainingId(somePDC.borrowerAppId);
  const mockOtherBorrowerAppExistence = () => borrowerApp.mockSetContainingId(otherPDC.borrowerAppId);

  beforeEach(async function () {
    [personalDataCategory, borrowerApp] = await Promise.all([
      PersonalDataCategory.new(contractVersion, { from: owner }),
      BorrowerApp.new(contractVersion, { from: owner }),
    ]);
  });

  describe('Register', async function () {
    context('when BorrowerApp is set', function () {
      beforeEach(async function () {
        await personalDataCategory.setBorrowerAppContractAddress(borrowerApp.address, { from: owner });
      });

      it('add a perosnal data category', async function () {
        await mockSomeBorrowerAppExistence();

        const { code, category1, category2, category3, borrowerAppId, score, rewardCycle } = somePDC;
        await personalDataCategory.add(
          code, category1, category2, category3, borrowerAppId, score, rewardCycle,
          { from: owner }
        ).should.be.fulfilled;
      });

      it('emits an event on adding an perosnal data category', async function () {
        await mockSomeBorrowerAppExistence();
        const { code, category1, category2, category3, borrowerAppId, score, rewardCycle } = somePDC;
        const events = await eventsIn(personalDataCategory.add(
          code, category1, category2, category3, borrowerAppId, score, rewardCycle,
          { from: owner }
        ));

        events.should.deep.include({
          name: 'LogPersonalDataCategoryAdded',
          args: { code, borrowerAppId },
        });
      });

      it('reverts on adding a perosnal data category by non owner', async function () {
        await mockSomeBorrowerAppExistence();

        const { code, category1, category2, category3, borrowerAppId, score, rewardCycle } = somePDC;
        await personalDataCategory.add(
          code, category1, category2, category3, borrowerAppId, score, rewardCycle,
          { from: nonOwner }
        ).should.be.rejectedWith(/revert/);
      });

      it('reverts on adding a perosnal data category with unregistered borrower app', async function () {
        const { code, category1, category2, category3, score, rewardCycle } = somePDC;
        await personalDataCategory.add(
          code, category1, category2, category3, nonOwner, score, rewardCycle,
          { from: owner }
        ).should.be.rejectedWith(/Borrower app is not found/);
      });

      it('reverts on adding a perosnal data category with duplicated code', async function () {
        await mockSomeBorrowerAppExistence();

        await personalDataCategory.add(
          somePDC.code,
          somePDC.category1,
          somePDC.category2,
          somePDC.category3,
          somePDC.borrowerAppId,
          somePDC.score,
          somePDC.rewardCycle,
          { from: owner }
        );

        await personalDataCategory.add(
          somePDC.code,
          otherPDC.category1,
          otherPDC.category2,
          otherPDC.category3,
          somePDC.borrowerAppId,
          somePDC.score,
          somePDC.rewardCycle,
          { from: owner }
        ).should.be.rejectedWith(/Personal data category code already exists/);
      });

      it('reverts on adding a perosnal data category with empty Category1', async function () {
        await mockSomeBorrowerAppExistence();
        await personalDataCategory.add(
          somePDC.code,
          '',
          somePDC.category2,
          somePDC.category3,
          somePDC.borrowerAppId,
          somePDC.score,
          somePDC.rewardCycle,
          { from: owner }
        ).should.be.rejectedWith(/Category1 is required/);
      });

      it('reverts on adding a perosnal data category with empty Category2 but not empty Category3', async function () {
        await mockSomeBorrowerAppExistence();
        await personalDataCategory.add(
          somePDC.code,
          somePDC.category1,
          '',
          somePDC.category3,
          somePDC.borrowerAppId,
          somePDC.score,
          somePDC.rewardCycle,
          { from: owner }
        ).should.be.rejectedWith(/Category2 can not be empty while Category3 exists/);
      });

      it('reverts on adding a perosnal data category with duplicated composition', async function () {
        await mockSomeBorrowerAppExistence();

        await personalDataCategory.add(
          somePDC.code,
          somePDC.category1,
          somePDC.category2,
          somePDC.category3,
          somePDC.borrowerAppId,
          somePDC.score,
          somePDC.rewardCycle,
          { from: owner }
        );

        await personalDataCategory.add(
          otherPDC.code,
          somePDC.category1,
          somePDC.category2,
          somePDC.category3,
          somePDC.borrowerAppId,
          somePDC.score,
          somePDC.rewardCycle,
          { from: owner },
        ).should.be.rejectedWith(/Personal data category composition already exists/);
      });

      it('reverts on adding a perosnal data category with invalid reward cycle', async function () {
        await mockSomeBorrowerAppExistence();
        await personalDataCategory.add(
          otherPDC.code,
          somePDC.category1,
          somePDC.category2,
          somePDC.category3,
          somePDC.borrowerAppId,
          somePDC.score,
          getInvalidRewardCycle(),
          { from: owner },
        ).should.be.rejectedWith(/Personal data reward cycle is invalid/);
        await personalDataCategory.add(
          otherPDC.code,
          somePDC.category1,
          somePDC.category2,
          somePDC.category3,
          somePDC.borrowerAppId,
          somePDC.score,
          getInvalidRewardCycle(),
          { from: owner },
        ).should.be.rejectedWith(/Personal data reward cycle is invalid/);
      });
    });

    it('reverts on adding a valid perosnal data category when BorrowerApp contract is not set', async function () {
      await mockSomeBorrowerAppExistence();

      await personalDataCategory.add(
        somePDC.code, somePDC.category1, somePDC.category2, somePDC.category3, somePDC.borrowerAppId, somePDC.score, somePDC.rewardCycle,
        { from: owner }
      ).should.be.rejectedWith(/BorrowerApp contract is not set/);

      await personalDataCategory.add(
        otherPDC.code, otherPDC.category1, otherPDC.category2, otherPDC.category3, otherPDC.borrowerAppId, otherPDC.score, otherPDC.rewardCycle,
        { from: owner }
      ).should.be.rejectedWith(/BorrowerApp contract is not set/);
    });
  });

  describe('Modification', async function () {
    context('when some perosnal data category is registered', async function () {
      beforeEach(async function () {
        await Promise.all([
          personalDataCategory.setBorrowerAppContractAddress(borrowerApp.address, { from: owner }),
          mockSomeBorrowerAppExistence(),
          mockOtherBorrowerAppExistence(),
        ]);

        // Register some personal data category
        const { code, category1, category2, category3, borrowerAppId, score, rewardCycle } = somePDC;
        await personalDataCategory.add(
          code, category1, category2, category3, borrowerAppId, score, rewardCycle,
          { from: owner },
        );
      });

      it('updates the category composition', async function () {
        const { code, category1, category2, category3, borrowerAppId, score, rewardCycle } = somePDC;
        const newCategory3 = 'cellphone';
        await personalDataCategory.update(
          code, category1, category2, newCategory3, score, rewardCycle,
          { from: owner }
        ).should.be.fulfilled;

        // use old category composition
        await personalDataCategory.add(
          code.add(1), category1, category2, category3, borrowerAppId, score, rewardCycle,
          { from: owner }
        ).should.be.fulfilled;
      });

      it('updates the score,rewardCycle keeping category composition', async function () {
        const { code, category1, category2, category3, score, rewardCycle } = somePDC;
        await personalDataCategory.update(
          code, category1, category2, category3, score + 200, rewardCycle,
          { from: owner }
        ).should.be.fulfilled;

        await personalDataCategory.update(
          code, category1, category2, category3, score + 200, REWARD_CYCLE.MONTHLY,
          { from: owner }
        ).should.be.fulfilled;
      });

      it('uses the old composite category after updates', async function () {
        const { code, category1, category2, category3, borrowerAppId, score, rewardCycle } = somePDC;
        const newCategory3 = 'cellphone';
        await personalDataCategory.update(
          code, category1, category2, newCategory3, score, rewardCycle,
          { from: owner }
        );

        // now old category composition is available
        await personalDataCategory.add(
          code.add(1), category1, category2, category3, borrowerAppId, score, rewardCycle,
          { from: owner }
        ).should.be.fulfilled;
      });

      it('emit an event on updating personal data category', async function () {
        const { code, category1, category2, score, rewardCycle } = somePDC;
        const newCategory3 = 'cellphone';
        const events = await eventsIn(personalDataCategory.update(
          code, category1, category2, newCategory3, score, rewardCycle,
          { from: owner }
        ));

        events.should.deep.include({
          name: 'LogPersonalDataCategoryUpdated',
          args: {
            code,
            category1,
            category2,
            category3: newCategory3,
            score,
            rewardCycle,
          },
        });
      });

      it('reverts on updating duplicated category composition', async function () {
        const { code, category1, category2, category3, borrowerAppId, score, rewardCycle } = otherPDC;
        const { category1: dupCategory1, category2: dupCategory2, category3: dupCategory3 } = somePDC;
        await personalDataCategory.add(
          code, category1, category2, category3, borrowerAppId, score, rewardCycle,
          { from: owner }
        );

        await personalDataCategory.update(
          code, dupCategory1, dupCategory2, dupCategory3, score, rewardCycle,
          { from: owner }
        ).should.be.rejectedWith(/Personal data category composition to update already exists/);
      });

      it('reverts on updating with empty Category1', async function () {
        const { code, category2, category3, score, rewardCycle } = somePDC;
        await personalDataCategory.update(
          code, '', category2, category3, score, rewardCycle,
          { from: owner }
        ).should.be.rejectedWith(/Category1 is required/);
      });


      it('reverts on updating with empty Category2 but not empty Category3', async function () {
        const { code, category1, category3, score, rewardCycle } = somePDC;
        await personalDataCategory.update(
          code, category1, '', category3, score, rewardCycle,
          { from: owner }
        ).should.be.rejectedWith(/Category2 can not be empty while Category3 exists/);
      });

      it('reverts on updating a perosnal data category with invalid reward cycle', async function () {
        const { code, category1, category2, score } = somePDC;
        await personalDataCategory.update(
          code, category1, category2, 'new category 3', score, getInvalidRewardCycle(),
          { from: owner }
        ).should.be.rejectedWith(/Personal data reward cycle is invalid/);
        await personalDataCategory.update(
          code, category1, category2, 'new category 3', score, getInvalidRewardCycle(),
          { from: owner }
        ).should.be.rejectedWith(/Personal data reward cycle is invalid/);
      });

      it('reverts on updating the category composition by non owner', async function () {
        const { code, category1, category2, score, rewardCycle } = somePDC;
        const newCategory3 = 'cellphone';
        await personalDataCategory.update(
          code, category1, category2, newCategory3, score, rewardCycle,
          { from: nonOwner }
        ).should.be.rejectedWith(/revert/);
      });
    });

    it('reverts on updating an unregistred personal data category', async function () {
      const { code, category1, category2, score, rewardCycle } = somePDC;
      const newCategory3 = 'cellphone';
      await personalDataCategory.update(
        code, category1, category2, newCategory3, score, rewardCycle,
        { from: owner }
      ).should.be.rejectedWith(/Personal data category code is not found/);
    });
  });

  describe('Unregister', async function () {
    context('when perosnal data categories are registered', async function () {
      let addedTime;

      beforeEach(async function () {
        await Promise.all([
          personalDataCategory.setBorrowerAppContractAddress(borrowerApp.address, { from: owner }),
          mockSomeBorrowerAppExistence(),
          mockOtherBorrowerAppExistence(),
        ]);

        // Register personal data categories
        [addedTime] = await Promise.all([
          latestTime(),
          personalDataCategory.add(
            somePDC.code,
            somePDC.category1,
            somePDC.category2,
            somePDC.category3,
            somePDC.borrowerAppId,
            somePDC.score,
            somePDC.rewardCycle,
            { from: owner },
          ),
        ]);
        await personalDataCategory.add(
          otherPDC.code,
          otherPDC.category1,
          otherPDC.category2,
          otherPDC.category3,
          otherPDC.borrowerAppId,
          otherPDC.score,
          otherPDC.rewardCycle,
          { from: owner },
        );
      });

      it('removes perosnal data category identified by code', async function () {
        await personalDataCategory.remove(somePDC.code, { from: owner }).should.be.fulfilled;
        await personalDataCategory.remove(otherPDC.code, { from: owner }).should.be.fulfilled;
      });

      it('emits an event on removing a perosnal data category identified by code', async function () {
        const somePDCRemovalEvents = await eventsIn(personalDataCategory.remove(somePDC.code, { from: owner }));
        somePDCRemovalEvents.should.deep.include({
          name: 'LogPersonalDataCategoryDeleted',
          args: { code: somePDC.code, borrowerAppId: somePDC.borrowerAppId },
        });

        const otherPDCRemovalEvents = await eventsIn(personalDataCategory.remove(otherPDC.code, { from: owner }));
        otherPDCRemovalEvents.should.deep.include({
          name: 'LogPersonalDataCategoryDeleted',
          args: { code: otherPDC.code, borrowerAppId: otherPDC.borrowerAppId },
        });
      });

      it('reverts on removing a perosnal data category by non owner', async function () {
        await personalDataCategory.remove(somePDC.code, { from: nonOwner }).should.be.rejectedWith(/revert/);
        await personalDataCategory.remove(otherPDC.code, { from: nonOwner }).should.be.rejectedWith(/revert/);
      });

      it('reverts on removing an unregistered perosnal data category', async function () {
        const uknownCode = 999;
        await personalDataCategory.remove(uknownCode, { from: owner }).should.be.rejectedWith(/Personal data category code is not found/);

        await personalDataCategory.remove(somePDC.code, { from: owner }).should.be.fulfilled;
        await personalDataCategory.remove(somePDC.code, { from: owner }).should.be.rejectedWith(/Personal data category code is not found/);
      });
    });
  });

  describe('Retrieve', async function () {
    context('when perosnal data categories are registered', async function () {
      let addedTime;

      beforeEach(async function () {
        await Promise.all([
          personalDataCategory.setBorrowerAppContractAddress(borrowerApp.address, { from: owner }),
          mockSomeBorrowerAppExistence(),
          mockOtherBorrowerAppExistence(),
        ]);

        // Register personal data categories
        [addedTime] = await Promise.all([
          latestTime(),
          personalDataCategory.add(
            somePDC.code,
            somePDC.category1,
            somePDC.category2,
            somePDC.category3,
            somePDC.borrowerAppId,
            somePDC.score,
            somePDC.rewardCycle,
            { from: owner },
          ),
        ]);
        await personalDataCategory.add(
          otherPDC.code,
          otherPDC.category1,
          otherPDC.category2,
          otherPDC.category3,
          otherPDC.borrowerAppId,
          otherPDC.score,
          otherPDC.rewardCycle,
          { from: owner },
        );
      });

      it('gets a personal data category with code', async function () {
        const [, category1, category2, category3, borrowerAppId, score, rewardCycle, updatedTime] = await personalDataCategory.get(somePDC.code);
        category1.should.be.equal(somePDC.category1);
        category2.should.be.equal(somePDC.category2);
        category3.should.be.equal(somePDC.category3);
        borrowerAppId.should.be.equal(somePDC.borrowerAppId);
        score.should.be.bignumber.equal(somePDC.score);
        rewardCycle.should.be.bignumber.equal(somePDC.rewardCycle);
        updatedTime.should.be.withinTimeTolerance(addedTime);
      });

      it('gets all personal data categories with codes', async function () {
        const codes = await personalDataCategory.getCodeList();
        codes.length.should.equal(2);

        const categories = await Promise.all(codes.map(code => personalDataCategory.get(code)));

        const expectedCategories = [somePDC, otherPDC];

        categories.forEach(([, category1, category2, category3, borrowerAppId, score, rewardCycle], i) => {
          const expectedCategory = expectedCategories[i];
          category1.should.be.equal(expectedCategory.category1);
          category2.should.be.equal(expectedCategory.category2);
          category3.should.be.equal(expectedCategory.category3);
          borrowerAppId.should.be.equal(expectedCategory.borrowerAppId);
          score.should.be.bignumber.equal(expectedCategory.score);
          rewardCycle.should.be.bignumber.equal(expectedCategory.rewardCycle);
        });
      });

      it('gets all personal data categories by code list index', async function () {
        const size = await personalDataCategory.size();
        size.should.be.bignumber.equal(2);

        const categories = await Promise.all(
          range(size).map(index => personalDataCategory.getByIndex(index))
        );

        const expectedCategories = [somePDC, otherPDC];

        categories.forEach(([, category1, category2, category3, borrowerAppId], i) => {
          const expectedCategory = expectedCategories[i];
          category1.should.be.equal(expectedCategory.category1);
          category2.should.be.equal(expectedCategory.category2);
          category3.should.be.equal(expectedCategory.category3);
          borrowerAppId.should.be.equal(expectedCategory.borrowerAppId);
        });
      });

      it('reverts on getting a personal data category by invalid index', async function () {
        await personalDataCategory.getByIndex(1).should.be.fulfilled;
        await personalDataCategory.getByIndex(2).should.be.rejectedWith(/Index is out of range of personal data category list/);
      });

      it('gets all personal data categories for borrower app with codes', async function () {
        const borrowerAppCodes = await personalDataCategory.getBorrowerAppCodeList(somePDC.borrowerAppId);
        borrowerAppCodes.length.should.equal(1);
        const categories = await Promise.all(borrowerAppCodes.map(code => personalDataCategory.get(code)));

        const expectedCategories = [somePDC, otherPDC];

        categories.forEach(([, category1, category2, category3, borrowerAppId, score, rewardCycle], i) => {
          const expectedCategory = expectedCategories[i];
          category1.should.be.equal(expectedCategory.category1);
          category2.should.be.equal(expectedCategory.category2);
          category3.should.be.equal(expectedCategory.category3);
          borrowerAppId.should.be.equal(expectedCategory.borrowerAppId);
          score.should.be.bignumber.equal(expectedCategory.score);
          rewardCycle.should.be.bignumber.equal(expectedCategory.rewardCycle);
        });
      });

      it('gets all personal data categories for borrower app', async function () {
        const someBorrowerAppCodeListSize = await personalDataCategory.getborrowerAppCodeListSize(somePDC.borrowerAppId);
        someBorrowerAppCodeListSize.should.be.bignumber.equal(1);

        const categories = await Promise.all(
          range(someBorrowerAppCodeListSize).map(index =>
            personalDataCategory.getByBorrowerAppCodeListIndex(somePDC.borrowerAppId, index)
          )
        );

        const expectedCategories = [somePDC, otherPDC];

        categories.forEach(([, category1, category2, category3, borrowerAppId, score, rewardCycle], i) => {
          const expectedCategory = expectedCategories[i];
          category1.should.be.equal(expectedCategory.category1);
          category2.should.be.equal(expectedCategory.category2);
          category3.should.be.equal(expectedCategory.category3);
          borrowerAppId.should.be.equal(expectedCategory.borrowerAppId);
          score.should.be.bignumber.equal(expectedCategory.score);
          rewardCycle.should.be.bignumber.equal(expectedCategory.rewardCycle);
        });
      });

      it('get reward cycle in time by category code', async function() {
        const dayInSeconds = new BigNumber(60 * 60 * 24);
        const weekInSeconds = dayInSeconds.mul(7);
        const yearInSeconds = dayInSeconds.mul(365);

        (await personalDataCategory.getRewardCycleInSecondsByCode(somePDC.code)).should.be.bignumber.equal(weekInSeconds);
        (await personalDataCategory.getRewardCycleInSecondsByCode(otherPDC.code)).should.be.bignumber.equal(yearInSeconds);
      });
      
      it('reverts on getting a personal data category for borrower app by invalid index', async function () {
        await personalDataCategory.getByBorrowerAppCodeListIndex(somePDC.borrowerAppId, 0)
          .should.be.fulfilled;
        await personalDataCategory.getByBorrowerAppCodeListIndex(somePDC.borrowerAppId, 1)
          .should.be.rejectedWith(/Index is out of range of borrower app code list/);
      });
    });

    it('reverts on getting an unregistered personal data category', async function () {
      await personalDataCategory.get(somePDC.code).should.be.rejectedWith(/Personal data category code is not found/);
      await personalDataCategory.get(1000).should.be.rejectedWith(/Personal data category code is not found/);
    });
  });
});



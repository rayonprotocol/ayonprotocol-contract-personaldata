import { latestTime } from 'openzeppelin-solidity/test/helpers/latestTime';
import eventsIn from './helpers/eventsIn';
import assertWithinTimeTolerance from './helpers/assertWithinTimeTolerance';
import toByte32Hex from './helpers/toByte32Hex';

const PersonalDataCategory = artifacts.require('./PersonalDataCategory.sol');
const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .use(require('chai-as-promised'))
  .use(assertWithinTimeTolerance)
  .should();

const contractVersion = 1;

const range = (size) => [...Array(size instanceof BigNumber ? size.toNumber() : size)]
  .map((_, index) => index);

contract('PersonalDataCategory', function (accounts) {
  const [
    someBorrowerApp, otherBorrowerApp,
    nonOwner, owner,
  ] = accounts;

  let personalDataCategory;

  const somePersonalDataCategory = {
    code: new BigNumber(200),
    category1: 'thing',
    category2: 'electronics',
    category3: 'computer',
    borrowerAppId: someBorrowerApp,
  };

  const otherPersonalDataCategory = {
    code: new BigNumber(300),
    category1: 'things',
    category2: 'transporter',
    category3: 'car',
    borrowerAppId: otherBorrowerApp,
  };

  beforeEach(async function () {
    personalDataCategory = await PersonalDataCategory.new(contractVersion, { from: owner });
  });

  describe('Register', async function () {
    it('add a perosnal data category', async function () {
      const { code, category1, category2, category3, borrowerAppId } = somePersonalDataCategory;
      await personalDataCategory.add(
        code, category1, category2, category3, borrowerAppId,
        { from: owner }
      ).should.be.fulfilled;
    });

    it('emits an event on adding an perosnal data category', async function () {
      const { code, category1, category2, category3, borrowerAppId } = somePersonalDataCategory;
      const events = await eventsIn(personalDataCategory.add(
        code, category1, category2, category3, borrowerAppId,
        { from: owner }
      ));

      events.should.deep.include({
        name: 'LogPersonalDataCategoryAdded',
        args: { code, borrowerAppId },
      });
    });

    it('reverts on adding a perosnal data category by non owner', async function () {
      const { code, category1, category2, category3, borrowerAppId } = somePersonalDataCategory;
      await personalDataCategory.add(
        code, category1, category2, category3, borrowerAppId,
        { from: nonOwner }
      ).should.be.rejectedWith(/revert/);
    });

    it('reverts on adding a perosnal data category with duplicated code', async function () {
      await personalDataCategory.add(
        somePersonalDataCategory.code,
        somePersonalDataCategory.category1,
        somePersonalDataCategory.category2,
        somePersonalDataCategory.category3,
        somePersonalDataCategory.borrowerAppId,
        { from: owner }
      );

      await personalDataCategory.add(
        somePersonalDataCategory.code,
        otherPersonalDataCategory.category1,
        otherPersonalDataCategory.category2,
        otherPersonalDataCategory.category3,
        somePersonalDataCategory.borrowerAppId,
        { from: owner }
      ).should.be.rejectedWith(/Personal data category code is already exists/);
    });

    it('reverts on adding a perosnal data category with duplicated composition', async function () {
      await personalDataCategory.add(
        somePersonalDataCategory.code,
        somePersonalDataCategory.category1,
        somePersonalDataCategory.category2,
        somePersonalDataCategory.category3,
        somePersonalDataCategory.borrowerAppId,
        { from: owner }
      );

      await personalDataCategory.add(
        otherPersonalDataCategory.code,
        somePersonalDataCategory.category1,
        somePersonalDataCategory.category2,
        somePersonalDataCategory.category3,
        somePersonalDataCategory.borrowerAppId,
        { from: owner },
      ).should.be.rejectedWith(/Personal data category composition is already exists/);
    });
  });

  describe('Modification', async function () {
    beforeEach(async function () {
      // Register some personal data category
      const { code, category1, category2, category3, borrowerAppId } = somePersonalDataCategory;
      await personalDataCategory.add(
        code, category1, category2, category3, borrowerAppId,
        { from: owner },
      );
    });

    it('updates the category composition', async function () {
      const { code, category1, category2 } = somePersonalDataCategory;
      const newCategory3 = 'cellphone';
      await personalDataCategory.update(
        code, category1, category2, newCategory3,
        { from: owner }
      ).should.be.fulfilled;
    });

    it('emit an event on updating the category composition', async function () {
      const { code, category1, category2 } = somePersonalDataCategory;
      const newCategory3 = 'cellphone';
      const events = await eventsIn(personalDataCategory.update(
        code, category1, category2, newCategory3,
        { from: owner }
      ));

      events.should.deep.include({
        name: 'LogPersonalDataCategoryUpdated',
        args: {
          code,
          category1: toByte32Hex(category1),
          category2: toByte32Hex(category2),
          category3: toByte32Hex(newCategory3),
        },
      });
    });

    it('reverts on updating duplicated category composition', async function () {
      const { code, category1, category2, category3 } = somePersonalDataCategory;
      await personalDataCategory.update(
        code, category1, category2, category3,
        { from: owner }
      ).should.be.rejectedWith(/Personal data category composition to update is already exists/);
    });

    it('reverts on updating the category composition by non owner', async function () {
      const { code, category1, category2 } = somePersonalDataCategory;
      const newCategory3 = 'cellphone';
      await personalDataCategory.update(
        code, category1, category2, newCategory3,
        { from: nonOwner }
      ).should.be.rejectedWith(/revert/);
    });
  });

  describe('Retrieve', async function () {
    let addedTime;

    beforeEach(async function () {
      // Register personal data categories
      [addedTime] = await Promise.all([
        latestTime(),
        personalDataCategory.add(
          somePersonalDataCategory.code,
          somePersonalDataCategory.category1,
          somePersonalDataCategory.category2,
          somePersonalDataCategory.category3,
          somePersonalDataCategory.borrowerAppId,
          { from: owner },
        ),
      ]);
      await personalDataCategory.add(
        otherPersonalDataCategory.code,
        otherPersonalDataCategory.category1,
        otherPersonalDataCategory.category2,
        otherPersonalDataCategory.category3,
        otherPersonalDataCategory.borrowerAppId,
        { from: owner },
      );
    });

    it('gets a personal data category with code', async function () {
      const [, category1, category2, category3, borrowerAppId, updatedTime] = await personalDataCategory.get(somePersonalDataCategory.code);
      category1.should.be.equal(toByte32Hex(somePersonalDataCategory.category1));
      category2.should.be.equal(toByte32Hex(somePersonalDataCategory.category2));
      category3.should.be.equal(toByte32Hex(somePersonalDataCategory.category3));
      borrowerAppId.should.be.equal(somePersonalDataCategory.borrowerAppId);
      updatedTime.should.be.withinTimeTolerance(addedTime);
    });

    it('reverts on getting a personal data category with invalid code', async function () {
      await personalDataCategory.get(somePersonalDataCategory.code).should.be.fulfilled;
      await personalDataCategory.get(1000).should.be.rejectedWith(/Personal data category code is not found/);
    });

    it('gets all personal data categories with codes', async function () {
      const codes = await personalDataCategory.getCodeList();
      codes.length.should.equal(2);

      const categories = await Promise.all(codes.map(code => personalDataCategory.get(code)));

      const expectedCategories = [somePersonalDataCategory, otherPersonalDataCategory];

      categories.forEach(([, category1, category2, category3, borrowerAppId], i) => {
        const expectedCategory = expectedCategories[i];
        category1.should.be.equal(toByte32Hex(expectedCategory.category1));
        category2.should.be.equal(toByte32Hex(expectedCategory.category2));
        category3.should.be.equal(toByte32Hex(expectedCategory.category3));
        borrowerAppId.should.be.equal(expectedCategory.borrowerAppId);
      });
    });

    it('gets all personal data categories by code list index', async function () {
      const size = await personalDataCategory.size();
      size.should.be.bignumber.equal(2);

      const categories = await Promise.all(
        range(size).map(index => personalDataCategory.getByIndex(index))
      );

      const expectedCategories = [somePersonalDataCategory, otherPersonalDataCategory];

      categories.forEach(([, category1, category2, category3, borrowerAppId], i) => {
        const expectedCategory = expectedCategories[i];
        category1.should.be.equal(toByte32Hex(expectedCategory.category1));
        category2.should.be.equal(toByte32Hex(expectedCategory.category2));
        category3.should.be.equal(toByte32Hex(expectedCategory.category3));
        borrowerAppId.should.be.equal(expectedCategory.borrowerAppId);
      });
    });

    it('reverts on getting a personal data category by invalid index', async function () {
      await personalDataCategory.getByIndex(1).should.be.fulfilled;
      await personalDataCategory.getByIndex(2).should.be.rejectedWith(/Index is out of range of personal data category list/);
    });

    it('gets all personal data categories for borrower app with codes', async function () {
      const borrowerAppCodes = await personalDataCategory.getBorrowerAppCodeList(somePersonalDataCategory.borrowerAppId);
      borrowerAppCodes.length.should.equal(1);
      const categories = await Promise.all(borrowerAppCodes.map(code => personalDataCategory.get(code)));

      const expectedCategories = [somePersonalDataCategory, otherPersonalDataCategory];

      categories.forEach(([, category1, category2, category3, borrowerAppId], i) => {
        const expectedCategory = expectedCategories[i];
        category1.should.be.equal(toByte32Hex(expectedCategory.category1));
        category2.should.be.equal(toByte32Hex(expectedCategory.category2));
        category3.should.be.equal(toByte32Hex(expectedCategory.category3));
        borrowerAppId.should.be.equal(expectedCategory.borrowerAppId);
      });
    });

    it('gets all personal data categories for borrower app', async function () {
      const someBorrowerAppCodeListSize = await personalDataCategory.getborrowerAppCodeListSize(somePersonalDataCategory.borrowerAppId);
      someBorrowerAppCodeListSize.should.be.bignumber.equal(1);

      const categories = await Promise.all(
        range(someBorrowerAppCodeListSize).map(index =>
          personalDataCategory.getByBorrowerAppCodeListIndex(somePersonalDataCategory.borrowerAppId, index)
        )
      );

      const expectedCategories = [somePersonalDataCategory, otherPersonalDataCategory];

      categories.forEach(([, category1, category2, category3, borrowerAppId], i) => {
        const expectedCategory = expectedCategories[i];
        category1.should.be.equal(toByte32Hex(expectedCategory.category1));
        category2.should.be.equal(toByte32Hex(expectedCategory.category2));
        category3.should.be.equal(toByte32Hex(expectedCategory.category3));
        borrowerAppId.should.be.equal(expectedCategory.borrowerAppId);
      });
    });

    it('reverts on getting a personal data category for borrower app by invalid index', async function () {
      await personalDataCategory.getByBorrowerAppCodeListIndex(somePersonalDataCategory.borrowerAppId, 0)
        .should.be.fulfilled;
      await personalDataCategory.getByBorrowerAppCodeListIndex(somePersonalDataCategory.borrowerAppId, 1)
        .should.be.rejectedWith(/Index is out of range of borrower app code list/);
    });
  });
});



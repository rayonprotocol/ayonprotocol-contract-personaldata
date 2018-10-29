import { latestTime } from 'openzeppelin-solidity/test/helpers/latestTime';
import eventsIn from './helpers/eventsIn';
import assertWithinTimeTolerance from './helpers/assertWithinTimeTolerance';
import toByte32Hex from './helpers/toByte32Hex';

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
  };

  const otherPDC = {
    code: new BigNumber(300),
    category1: 'things',
    category2: 'transporter',
    category3: 'car',
    borrowerAppId: otherBorrowerApp,
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

        const { code, category1, category2, category3, borrowerAppId } = somePDC;
        await personalDataCategory.add(
          code, category1, category2, category3, borrowerAppId,
          { from: owner }
        ).should.be.fulfilled;
      });

      it('emits an event on adding an perosnal data category', async function () {
        await mockSomeBorrowerAppExistence();
        const { code, category1, category2, category3, borrowerAppId } = somePDC;
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
        await mockSomeBorrowerAppExistence();

        const { code, category1, category2, category3, borrowerAppId } = somePDC;
        await personalDataCategory.add(
          code, category1, category2, category3, borrowerAppId,
          { from: nonOwner }
        ).should.be.rejectedWith(/revert/);
      });

      it('reverts on adding a perosnal data category with unregistered borrower app', async function () {
        const { code, category1, category2, category3 } = somePDC;
        await personalDataCategory.add(
          code, category1, category2, category3, nonOwner,
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
          { from: owner }
        );

        await personalDataCategory.add(
          somePDC.code,
          otherPDC.category1,
          otherPDC.category2,
          otherPDC.category3,
          somePDC.borrowerAppId,
          { from: owner }
        ).should.be.rejectedWith(/Personal data category code already exists/);
      });

      it('reverts on adding a perosnal data category with duplicated composition', async function () {
        await mockSomeBorrowerAppExistence();

        await personalDataCategory.add(
          somePDC.code,
          somePDC.category1,
          somePDC.category2,
          somePDC.category3,
          somePDC.borrowerAppId,
          { from: owner }
        );

        await personalDataCategory.add(
          otherPDC.code,
          somePDC.category1,
          somePDC.category2,
          somePDC.category3,
          somePDC.borrowerAppId,
          { from: owner },
        ).should.be.rejectedWith(/Personal data category composition is already exists/);
      });
    });

    it('reverts on adding a valid perosnal data category when BorrowerApp contract is not set', async function () {
      await mockSomeBorrowerAppExistence();

      await personalDataCategory.add(
        somePDC.code, somePDC.category1, somePDC.category2, somePDC.category3, somePDC.borrowerAppId,
        { from: owner }
      ).should.be.rejectedWith(/BorrowerApp contract is not set/);

      await personalDataCategory.add(
        otherPDC.code, otherPDC.category1, otherPDC.category2, otherPDC.category3, otherPDC.borrowerAppId,
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
        ]);

        // Register some personal data category
        const { code, category1, category2, category3, borrowerAppId } = somePDC;
        await personalDataCategory.add(
          code, category1, category2, category3, borrowerAppId,
          { from: owner },
        );
      });

      it('updates the category composition', async function () {
        const { code, category1, category2 } = somePDC;
        const newCategory3 = 'cellphone';
        await personalDataCategory.update(
          code, category1, category2, newCategory3,
          { from: owner }
        ).should.be.fulfilled;
      });

      it('emit an event on updating the category composition', async function () {
        const { code, category1, category2 } = somePDC;
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
        const { code, category1, category2, category3 } = somePDC;
        await personalDataCategory.update(
          code, category1, category2, category3,
          { from: owner }
        ).should.be.rejectedWith(/Personal data category composition to update is already exists/);
      });

      it('reverts on updating the category composition by non owner', async function () {
        const { code, category1, category2 } = somePDC;
        const newCategory3 = 'cellphone';
        await personalDataCategory.update(
          code, category1, category2, newCategory3,
          { from: nonOwner }
        ).should.be.rejectedWith(/revert/);
      });
    });

    it('reverts on updating an unregistred personal data category', async function () {
      const { code, category1, category2 } = somePDC;
      const newCategory3 = 'cellphone';
      await personalDataCategory.update(
        code, category1, category2, newCategory3,
        { from: owner }
      ).should.be.rejectedWith(/Personal data category code is not found/);
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
            { from: owner },
          ),
        ]);
        await personalDataCategory.add(
          otherPDC.code,
          otherPDC.category1,
          otherPDC.category2,
          otherPDC.category3,
          otherPDC.borrowerAppId,
          { from: owner },
        );
      });

      it('gets a personal data category with code', async function () {
        const [, category1, category2, category3, borrowerAppId, updatedTime] = await personalDataCategory.get(somePDC.code);
        category1.should.be.equal(toByte32Hex(somePDC.category1));
        category2.should.be.equal(toByte32Hex(somePDC.category2));
        category3.should.be.equal(toByte32Hex(somePDC.category3));
        borrowerAppId.should.be.equal(somePDC.borrowerAppId);
        updatedTime.should.be.withinTimeTolerance(addedTime);
      });

      it('gets all personal data categories with codes', async function () {
        const codes = await personalDataCategory.getCodeList();
        codes.length.should.equal(2);

        const categories = await Promise.all(codes.map(code => personalDataCategory.get(code)));

        const expectedCategories = [somePDC, otherPDC];

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

        const expectedCategories = [somePDC, otherPDC];

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
        const borrowerAppCodes = await personalDataCategory.getBorrowerAppCodeList(somePDC.borrowerAppId);
        borrowerAppCodes.length.should.equal(1);
        const categories = await Promise.all(borrowerAppCodes.map(code => personalDataCategory.get(code)));

        const expectedCategories = [somePDC, otherPDC];

        categories.forEach(([, category1, category2, category3, borrowerAppId], i) => {
          const expectedCategory = expectedCategories[i];
          category1.should.be.equal(toByte32Hex(expectedCategory.category1));
          category2.should.be.equal(toByte32Hex(expectedCategory.category2));
          category3.should.be.equal(toByte32Hex(expectedCategory.category3));
          borrowerAppId.should.be.equal(expectedCategory.borrowerAppId);
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

        categories.forEach(([, category1, category2, category3, borrowerAppId], i) => {
          const expectedCategory = expectedCategories[i];
          category1.should.be.equal(toByte32Hex(expectedCategory.category1));
          category2.should.be.equal(toByte32Hex(expectedCategory.category2));
          category3.should.be.equal(toByte32Hex(expectedCategory.category3));
          borrowerAppId.should.be.equal(expectedCategory.borrowerAppId);
        });
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



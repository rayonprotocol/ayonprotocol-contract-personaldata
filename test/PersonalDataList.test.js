import { latestTime } from 'openzeppelin-solidity/test/helpers/latestTime';
import eventsIn from './helpers/eventsIn';
import assertWithinTimeTolerance from './helpers/assertWithinTimeTolerance';
import toByte32Hex from './helpers/toByte32Hex';

const PersonalDataList = artifacts.require('PersonalDataList.sol');
const PersonalDataCategory = artifacts.require('PersonalDataCategory.sol');
const BorrowerApp = artifacts.require('BorrowerAppMock.sol');
const Borrower = artifacts.require('BorrowerMock.sol');
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
  DAILY: 'd',
  WEEKLY: 'w',
  MONTHLY: 'm',
  ANNUALLY: 'a',
};

contract('PersonalDataList', function (accounts) {
  const [
    borrowerId, otherBorrowerId,
    someBorrowerApp, otherBorrowerApp,
    nonOwner, owner,
  ] = accounts;

  let personalDataList, personalDataCategory, borrowerApp, borrower;

  const somePDC = { // PDC stands for Personal Data Category
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

  const borrowerData = {
    [somePDC.code]: web3.sha3('ThinkPad'), // computer
    [otherPDC.code]: web3.sha3('Prius'), // car
  };

  const registerSomePDC = () => personalDataCategory.add(
    somePDC.code, somePDC.category1, somePDC.category2, somePDC.category3, somePDC.borrowerAppId, somePDC.score, somePDC.rewardCycle, { from: owner }
  );
  const registerOtherPDC = () => personalDataCategory.add(
    otherPDC.code, otherPDC.category1, otherPDC.category2, otherPDC.category3, otherPDC.borrowerAppId, otherPDC.score, otherPDC.rewardCycle, { from: owner }
  );
  const mockSomeBorrowerAppExistence = () => borrowerApp.mockSetContainingId(somePDC.borrowerAppId);
  const mockOtherBorrowerAppExistence = () => borrowerApp.mockSetContainingId(otherPDC.borrowerAppId);
  const mockBorrowerExistence = () => borrower.mockSetContainingId(borrowerId);
  const mockOtherBorrowerExistence = () => borrower.mockSetContainingId(otherBorrowerId);

  beforeEach(async function () {
    [personalDataList, personalDataCategory, borrowerApp, borrower] = await Promise.all([
      PersonalDataList.new(contractVersion, { from: owner }),
      PersonalDataCategory.new(contractVersion, { from: owner }),
      BorrowerApp.new(contractVersion, { from: owner }),
      Borrower.new(contractVersion, { from: owner }),
    ]);
    await personalDataCategory.setBorrowerAppContractAddress(borrowerApp.address, { from: owner });
  });

  describe('Register', async function () {
    context('when BorrowerApp, Borrower, PersonalDataCategory contracts are set', async function () {
      beforeEach(async function () {
        await personalDataList.setBorrowerAppContractAddress(borrowerApp.address, { from: owner });
        await personalDataList.setBorrowerContractAddress(borrower.address, { from: owner });
        await personalDataList.setPersonalDataCategoryContractAddress(personalDataCategory.address, { from: owner });
      });

      it('adds a personal data', async function () {
        await mockSomeBorrowerAppExistence();
        await mockBorrowerExistence();
        await registerSomePDC();

        await personalDataList.add(
          borrowerId,
          somePDC.code,
          borrowerData[somePDC.code],
          { from: somePDC.borrowerAppId }
        ).should.be.fulfilled;

        await mockOtherBorrowerAppExistence();
        await mockOtherBorrowerExistence();
        await registerOtherPDC();

        await personalDataList.add(
          otherBorrowerId,
          otherPDC.code,
          borrowerData[otherPDC.code],
          { from: otherPDC.borrowerAppId }
        ).should.be.fulfilled;
      });

      it('emits an events on adding a personal data', async function () {
        await mockSomeBorrowerAppExistence();
        await mockBorrowerExistence();
        await registerSomePDC();

        const events = await eventsIn(personalDataList.add(
          borrowerId,
          somePDC.code,
          borrowerData[somePDC.code],
          { from: somePDC.borrowerAppId }
        ));

        events.should.deep.include({
          name: 'LogPersonalDataAdded',
          args: {
            borrowerId: borrowerId,
            categoryCode: somePDC.code,
            borrowerAppId: somePDC.borrowerAppId,
          },
        });
      });

      it('reverts on adding a personal data by unregistered borrower app', async function () {

        await personalDataList.add(
          borrowerId,
          somePDC.code,
          borrowerData[somePDC.code],
          { from: somePDC.borrowerAppId }
        ).should.be.rejectedWith(/msg.sender is not registred borrower app/);
      });

      it('reverts on adding a personal data with unregistered borrower', async function () {
        await mockSomeBorrowerAppExistence();
        await registerSomePDC();

        await personalDataList.add(
          borrowerId,
          somePDC.code,
          borrowerData[somePDC.code],
          { from: somePDC.borrowerAppId }
        ).should.be.rejectedWith(/Borrower is not found/);
      });

      it('reverts on adding a personal data with unregistered personal data category', async function () {
        await mockSomeBorrowerAppExistence();
        await mockBorrowerExistence();

        await personalDataList.add(
          borrowerId,
          somePDC.code,
          borrowerData[somePDC.code],
          { from: somePDC.borrowerAppId }
        ).should.be.rejectedWith(/Personal data category code is not found/);
      });
    });

    it('reverts on adding personal data when BorrowerApp contract is not set', async function () {
      await personalDataList.add(
        borrowerId,
        somePDC.code,
        borrowerData[somePDC.code],
        { from: somePDC.borrowerAppId }
      ).should.be.rejectedWith(/BorrowerApp contract is not set/);

      await personalDataList.setBorrowerContractAddress(borrower.address, { from: owner });
      await personalDataList.setPersonalDataCategoryContractAddress(personalDataCategory.address, { from: owner });

      await personalDataList.add(
        borrowerId,
        somePDC.code,
        borrowerData[somePDC.code],
        { from: somePDC.borrowerAppId }
      ).should.be.rejectedWith(/BorrowerApp contract is not set/);
    });

    it('reverts on adding personal data when Borrower contract is not set', async function () {
      await personalDataList.setBorrowerAppContractAddress(borrowerApp.address, { from: owner });
      await personalDataList.setPersonalDataCategoryContractAddress(personalDataCategory.address, { from: owner });

      await personalDataList.add(
        borrowerId,
        somePDC.code,
        borrowerData[somePDC.code],
        { from: somePDC.borrowerAppId }
      ).should.be.rejectedWith(/Borrower contract is not set/);
    });

    it('reverts on adding personal data when Borrower contract is not set', async function () {
      await personalDataList.setBorrowerAppContractAddress(borrowerApp.address, { from: owner });
      await personalDataList.setBorrowerContractAddress(borrower.address, { from: owner });

      await personalDataList.add(
        borrowerId,
        somePDC.code,
        borrowerData[somePDC.code],
        { from: somePDC.borrowerAppId }
      ).should.be.rejectedWith(/PersonalDataCategory contract is not set/);
    });
  });

  describe('Modification', async function () {
    context('when personal data is registered', async function () {
      beforeEach(async function () {
        await Promise.all([
          personalDataList.setBorrowerAppContractAddress(borrowerApp.address, { from: owner }),
          personalDataList.setBorrowerContractAddress(borrower.address, { from: owner }),
          personalDataList.setPersonalDataCategoryContractAddress(personalDataCategory.address, { from: owner }),
          mockSomeBorrowerAppExistence(),
        ]);

        await Promise.all([
          mockBorrowerExistence(),
          registerSomePDC(),
        ]);

        await personalDataList.add(
          borrowerId,
          somePDC.code,
          borrowerData[somePDC.code],
          { from: somePDC.borrowerAppId }
        );
      });

      it('updates personal data for borrower id', async function () {
        await personalDataList.update(borrowerId, somePDC.code, web3.sha3('MacBook Pro'), { from: somePDC.borrowerAppId })
          .should.be.fulfilled;
        await personalDataList.update(borrowerId, somePDC.code, web3.sha3('iMac'), { from: somePDC.borrowerAppId })
          .should.be.fulfilled;
      });

      it('emits an events on updating a personal data', async function () {
        const events = await eventsIn(personalDataList.update(
          borrowerId,
          somePDC.code,
          web3.sha3('MacBook Pro'),
          { from: somePDC.borrowerAppId }
        ));

        events.should.deep.include({
          name: 'LogPersonalDataUpdated',
          args: {
            borrowerId: borrowerId,
            categoryCode: somePDC.code,
            borrowerAppId: somePDC.borrowerAppId,
          },
        });
      });

      it('reverts on updating personal data by invalid borrower app', async function () {
        await personalDataList.update(borrowerId, somePDC.code, web3.sha3('Chromebook'), { from: otherBorrowerId })
          .should.be.rejectedWith(/msg.sender is not matched borrower app on personal data/);

        await personalDataList.update(borrowerId, somePDC.code, web3.sha3('Chromebook'), { from: nonOwner })
          .should.be.rejectedWith(/msg.sender is not matched borrower app on personal data/);
      });
    });

    it('reverts on updating unregistered personal data', async function () {
      await personalDataList.update(otherBorrowerId, somePDC.code, web3.sha3('Surface pro'), { from: somePDC.borrowerAppId })
        .should.be.rejectedWith(/Personal data for both borrower and category code is not found/);

      await personalDataList.update(borrowerId, otherPDC.code, web3.sha3('Surface pro'), { from: somePDC.borrowerAppId })
        .should.be.rejectedWith(/Personal data for both borrower and category code is not found/);
    });
  });

  describe('Retrieve', async function () {
    context('when personal data is registered', async function () {
      let someDataAddedTime;

      beforeEach(async function () {
        await Promise.all([
          personalDataList.setBorrowerAppContractAddress(borrowerApp.address, { from: owner }),
          personalDataList.setBorrowerContractAddress(borrower.address, { from: owner }),
          personalDataList.setPersonalDataCategoryContractAddress(personalDataCategory.address, { from: owner }),
          mockSomeBorrowerAppExistence(),
          mockOtherBorrowerAppExistence(),
        ]);

        await Promise.all([
          registerSomePDC(),
          registerOtherPDC(),
          mockBorrowerExistence(),
          mockOtherBorrowerExistence(),
        ]);

        [someDataAddedTime] = await Promise.all([
          latestTime(),
          personalDataList.add(
            borrowerId,
            somePDC.code,
            borrowerData[somePDC.code],
            { from: somePDC.borrowerAppId }
          ),
        ]);
      });

      it('get personal data for both borrower and category code', async function () {
        const [dataHash, borrowerAppId, updatedTime] = await personalDataList.get(borrowerId, somePDC.code);
        dataHash.should.be.equal(borrowerData[somePDC.code]);
        borrowerAppId.should.be.equal(somePDC.borrowerAppId);
        updatedTime.should.be.withinTimeTolerance(someDataAddedTime);
      });

      it('get all personal data', async function () {
        const [otherDataAddedTime] = await Promise.all([
          latestTime(),
          personalDataList.add(
            otherBorrowerId,
            otherPDC.code,
            borrowerData[otherPDC.code],
            { from: otherPDC.borrowerAppId }
          ),
        ]);
        const size = await personalDataList.size();
        size.should.be.bignumber.equal(2);

        const dataList = await Promise.all(
          range(size).map(index => personalDataList.getByIndex(index))
        );

        const expectedDataList = [
          {
            borrowerId,
            categoryCode: somePDC.code,
            dataHash: borrowerData[somePDC.code],
            borrowerAppId: somePDC.borrowerAppId,
            updatedTime: someDataAddedTime,
          },
          {
            borrowerId: otherBorrowerId,
            categoryCode: otherPDC.code,
            dataHash: borrowerData[otherPDC.code],
            borrowerAppId: otherPDC.borrowerAppId,
            updatedTime: otherDataAddedTime,
          },
        ];

        dataList.forEach(([borrowerId, categoryCode, dataHash, borrowerAppId, updatedTime], i) => {
          const expectedData = expectedDataList[i];
          borrowerId.should.be.equal(expectedData.borrowerId);
          categoryCode.should.be.bignumber.equal(expectedData.categoryCode);
          dataHash.should.be.equal(toByte32Hex(expectedData.dataHash));
          borrowerAppId.should.be.equal(expectedData.borrowerAppId);
          updatedTime.should.be.withinTimeTolerance(expectedData.updatedTime);
        });
      });

      it('get all personal data for borrower', async function () {
        const [otherDataAddedTime] = await Promise.all([
          latestTime(),
          personalDataList.add(
            borrowerId,
            otherPDC.code,
            borrowerData[otherPDC.code],
            { from: otherPDC.borrowerAppId }
          ),
        ]);
        const size = await personalDataList.getBorrowerDataListSize(borrowerId);
        size.should.be.bignumber.equal(2);

        const dataList = await Promise.all(
          range(size).map(index => personalDataList.getByBorrowerDataListIndex(borrowerId, index))
        );

        const expectedDataList = [
          { categoryCode: somePDC.code, dataHash: borrowerData[somePDC.code], borrowerAppId: somePDC.borrowerAppId, updatedTime: someDataAddedTime },
          { categoryCode: otherPDC.code, dataHash: borrowerData[otherPDC.code], borrowerAppId: otherPDC.borrowerAppId, updatedTime: otherDataAddedTime },
        ];

        dataList.forEach(([categoryCode, dataHash, borrowerAppId, updatedTime], i) => {
          const expectedData = expectedDataList[i];
          categoryCode.should.be.bignumber.equal(expectedData.categoryCode);
          dataHash.should.be.equal(toByte32Hex(expectedData.dataHash));
          borrowerAppId.should.be.equal(expectedData.borrowerAppId);
          updatedTime.should.be.withinTimeTolerance(expectedData.updatedTime);
        });
      });

      it('get all personal data for category', async function () {
        const otherBorrowerData = web3.sha3('MacBook Pro');
        const [otherDataAddedTime] = await Promise.all([
          latestTime(),
          personalDataList.add(
            otherBorrowerId,
            somePDC.code,
            otherBorrowerData,
            { from: somePDC.borrowerAppId }
          ),
        ]);

        const size = await personalDataList.getCategoryDataListSize(somePDC.code);
        size.should.be.bignumber.equal(2);

        const dataList = await Promise.all(
          range(size).map(index => personalDataList.getByCategoryDataListIndex(somePDC.code, index))
        );

        const expectedDataList = [
          { borrowerId: borrowerId, dataHash: borrowerData[somePDC.code], borrowerAppId: somePDC.borrowerAppId, updatedTime: someDataAddedTime },
          { borrowerId: otherBorrowerId, dataHash: otherBorrowerData, borrowerAppId: somePDC.borrowerAppId, updatedTime: otherDataAddedTime },
        ];

        dataList.forEach(([borrowerId, dataHash, borrowerAppId, updatedTime], i) => {
          const expectedData = expectedDataList[i];
          borrowerId.should.be.bignumber.equal(expectedData.borrowerId);
          dataHash.should.be.equal(toByte32Hex(expectedData.dataHash));
          borrowerAppId.should.be.equal(expectedData.borrowerAppId);
          updatedTime.should.be.withinTimeTolerance(expectedData.updatedTime);
        });
      });
    });

    it('reverts on getting personal data with any of invalid borrower and invalid categoryCode', async function () {
      await personalDataList.get(otherBorrowerId, somePDC.code, { from: somePDC.borrowerAppId })
        .should.be.rejectedWith(/Personal data for both borrower and category code is not found/);

      await personalDataList.get(borrowerId, otherPDC.code, { from: somePDC.borrowerAppId })
        .should.be.rejectedWith(/Personal data for both borrower and category code is not found/);
    });

    it('reverts on getting personal data with any of invalid borrower and index', async function () {
      const someBorrowerLastIndexPlusOne = await personalDataList.getBorrowerDataListSize(borrowerId);
      const otherBorrowerLastIndexPlusOne = await personalDataList.getBorrowerDataListSize(otherBorrowerId);

      await personalDataList.getByBorrowerDataListIndex(borrowerId, someBorrowerLastIndexPlusOne)
        .should.be.rejectedWith(/Personal data for both borrower and index is not found/);

      await personalDataList.getByBorrowerDataListIndex(borrowerId, someBorrowerLastIndexPlusOne + 1)
        .should.be.rejectedWith(/Personal data for both borrower and index is not found/);

      await personalDataList.getByBorrowerDataListIndex(otherBorrowerId, otherBorrowerLastIndexPlusOne)
        .should.be.rejectedWith(/Personal data for both borrower and index is not found/);

      await personalDataList.getByBorrowerDataListIndex(otherBorrowerId, otherBorrowerLastIndexPlusOne + 1)
        .should.be.rejectedWith(/Personal data for both borrower and index is not found/);
    });

    it('reverts on getting personal data with any of invalid category code and index', async function () {
      const someCategoryLastIndexPlusOne = await personalDataList.getCategoryDataListSize(somePDC.code);
      const otherCategoryLastIndexPlusOne = await personalDataList.getCategoryDataListSize(otherPDC.code);

      await personalDataList.getByCategoryDataListIndex(somePDC.code, someCategoryLastIndexPlusOne)
        .should.be.rejectedWith(/Personal data for both category code and index is not found/);

      await personalDataList.getByCategoryDataListIndex(somePDC.code, someCategoryLastIndexPlusOne + 1)
        .should.be.rejectedWith(/Personal data for both category code and index is not found/);

      await personalDataList.getByCategoryDataListIndex(otherPDC.code, otherCategoryLastIndexPlusOne)
        .should.be.rejectedWith(/Personal data for both category code and index is not found/);

      await personalDataList.getByCategoryDataListIndex(otherPDC.code, otherCategoryLastIndexPlusOne + 1)
        .should.be.rejectedWith(/Personal data for both category code and index is not found/);
    });
  });

  describe('Deletion', async function () {
    context('when personal data is registered', async function () {
      beforeEach(async function () {
        await Promise.all([
          personalDataList.setBorrowerAppContractAddress(borrowerApp.address, { from: owner }),
          personalDataList.setBorrowerContractAddress(borrower.address, { from: owner }),
          personalDataList.setPersonalDataCategoryContractAddress(personalDataCategory.address, { from: owner }),
          mockSomeBorrowerAppExistence(),
          mockBorrowerExistence(),
        ]);

        await registerSomePDC();

        await personalDataList.add(
          borrowerId,
          somePDC.code,
          borrowerData[somePDC.code],
          { from: somePDC.borrowerAppId }
        );
      });

      it('removes personal data', async function () {
        const listSizesBeforeDeletion = await Promise.all([
          personalDataList.size(),
          personalDataList.getBorrowerDataListSize(borrowerId),
          personalDataList.getCategoryDataListSize(somePDC.code),
        ]);
        await personalDataList.remove(borrowerId, somePDC.code, { from: somePDC.borrowerAppId })
          .should.be.fulfilled;

        const listSizesAfterDeletion = await Promise.all([
          personalDataList.size(),
          personalDataList.getBorrowerDataListSize(borrowerId),
          personalDataList.getCategoryDataListSize(somePDC.code),
        ]);

        listSizesAfterDeletion.forEach((sizeAfterDeletion, i) => {
          const sizeBeforeDeletion = listSizesBeforeDeletion[i];
          sizeAfterDeletion.should.be.bignumber.equal(sizeBeforeDeletion.minus(1));
        });
      });

      it('emits an events on updating a personal data', async function () {
        const events = await eventsIn(personalDataList.remove(
          borrowerId,
          somePDC.code,
          { from: somePDC.borrowerAppId }
        ));

        events.should.deep.include({
          name: 'LogPersonalDataDeleted',
          args: {
            borrowerId: borrowerId,
            categoryCode: somePDC.code,
            borrowerAppId: somePDC.borrowerAppId,
          },
        });
      });

      it('reverts on updating personal data by invalid borrower app', async function () {
        await personalDataList.remove(borrowerId, somePDC.code, { from: otherBorrowerId })
          .should.be.rejectedWith(/msg.sender is not matched borrower app on personal data/);

        await personalDataList.remove(borrowerId, somePDC.code, { from: nonOwner })
          .should.be.rejectedWith(/msg.sender is not matched borrower app on personal data/);
      });
    });

    it('reverts on removing personal data with any of invalid borrower and invalid categoryCode ', async function () {
      await personalDataList.remove(borrowerId, somePDC.code, { from: somePDC.borrowerAppId })
        .should.be.rejectedWith(/Personal data for both borrower and category code is not found/);
    });
  });
});

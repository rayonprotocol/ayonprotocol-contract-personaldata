const PersonalDataCategory = artifacts.require('PersonalDataCategory.sol');
const PersonalDataList = artifacts.require('PersonalDataList.sol');

module.exports = function (deployer, network, accounts) {
  const contractVersion = 1;
  return deployer
    .then(() => deployer.deploy(PersonalDataCategory, contractVersion))
    .then(() => deployer.deploy(PersonalDataList, contractVersion))
    .catch(error => console.error({ error }));
};

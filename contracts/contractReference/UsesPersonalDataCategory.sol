pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../../../rayonprotocol-contract-common/contracts/RayonBase.sol";

contract UsesPersonalDataCategory is Ownable {
    address internal personalDataCategoryContractAddress;
    event LogPersonalDataCategorySet(address personalDataCategoryContractAddress);

    modifier whenPersonalDataCategoryContractIsSet() {
        require(personalDataCategoryContractAddress != 0, "PersonalDataCategory contract is not set");
        _;
    }

    function setPersonalDataCategoryContractAddress(address _contractAddress) public onlyOwner {
        require(
            _contractAddress != 0 ||
            keccak256(abi.encodePacked(RayonBase(personalDataCategoryContractAddress).getName())) == keccak256(abi.encodePacked("PersonalDataCategory")),
            "PersonalDataCategory contract address is invalid");
        personalDataCategoryContractAddress = _contractAddress;
        emit LogPersonalDataCategorySet(personalDataCategoryContractAddress);
    }

    function getPersonalDataCategoryContractAddress() public view onlyOwner returns (address) {
        return personalDataCategoryContractAddress;
    }
}
pragma solidity ^0.4.23;

import "../../rayonprotocol-contract-common/contracts/RayonBase.sol";
import "./contractReference/UsesPersonalDataCategory.sol";
import "../../rayonprotocol-contract-borrower/contracts/contractReference/UsesBorrowerApp.sol";
import "../../rayonprotocol-contract-borrower/contracts/contractReference/UsesBorrower.sol";

import "./PersonalDataCategory.sol";
import "../../rayonprotocol-contract-borrower/contracts/BorrowerApp.sol";
import "../../rayonprotocol-contract-borrower/contracts/Borrower.sol";

contract PersonalDataList is UsesBorrowerApp, UsesBorrower, UsesPersonalDataCategory, RayonBase {
    
    struct PersonalDataEntry {
        address borrowerId;
        uint256 categoryCode;
        address borrowerAppId;
        bytes32 dataHash;
        uint256 keyListIndex;
        uint256 borrowerToKeyListIndex;
        uint256 categoryCodeToKeyListIndex;
        uint256 updatedTime;
    }
    bytes32[] private keyList;
    mapping(bytes32 => PersonalDataEntry) private entryMap;
    mapping(address => bytes32[]) private borrowerToKeyListMap;
    mapping(uint256 => bytes32[]) private categoryCodeToKeyListMap;

    // constructor
    constructor(uint16 version) RayonBase("PersonalDataList", version) public {}

    event LogPersonalDataAdded(address indexed borrowerId, uint256 indexed categoryCode, address indexed borrowerAppId);
    event LogPersonalDataUpdated(address indexed borrowerId, uint256 indexed categoryCode, address indexed borrowerAppId);
    event LogPersonalDataDeleted(address indexed borrowerId, uint256 indexed categoryCode, address indexed borrowerAppId);

    function add(address _borrowerId, uint256 _categoryCode, bytes32 _dataHash) public
        whenBorrowerAppContractIsSet
        whenBorrowerContractIsSet
        whenPersonalDataCategoryContractIsSet 
    {
        address borrowerAppId = msg.sender;
        require(
            BorrowerApp(borrowerAppContractAddress).contains(borrowerAppId),
            "msg.sender is not registred borrower app: only registered borrower app can add personal data for borrower"
        );
        require(Borrower(borrowerContractAddress).contains(_borrowerId), "Borrower is not found");
        require(PersonalDataCategory(personalDataCategoryContractAddress).contains(_categoryCode), "Personal data category code is not found");
        
        bytes32 key = keccak256(abi.encodePacked(_borrowerId, _categoryCode));
        require(!_contains(key), "Personal data for both borrower and category code already exists");
        PersonalDataEntry storage entry = entryMap[key];
        
        entry.borrowerId = _borrowerId;
        entry.categoryCode = _categoryCode;
        entry.borrowerAppId = borrowerAppId;
        entry.dataHash = _dataHash;
        entry.keyListIndex = keyList.push(key) - 1;
        entry.borrowerToKeyListIndex = borrowerToKeyListMap[_borrowerId].push(key) - 1;
        entry.categoryCodeToKeyListIndex = categoryCodeToKeyListMap[_categoryCode].push(key) - 1;
        entry.updatedTime = block.timestamp;
        emit LogPersonalDataAdded(_borrowerId, _categoryCode, borrowerAppId);
    }

    function update(address _borrowerId, uint256 _categoryCode, bytes32 _dataHash) public {
        address borrowerAppId = msg.sender;
        PersonalDataEntry storage entry = _getEntry(_borrowerId, _categoryCode);
        
        require(
            entry.borrowerAppId == borrowerAppId,
            "msg.sender is not matched borrower app on personal data: only borrower app that added personal data can update"
        );
        entry.dataHash = _dataHash;
        entry.updatedTime = block.timestamp;
        emit LogPersonalDataUpdated(_borrowerId, _categoryCode, borrowerAppId);
    }

    function get(address _borrowerId, uint256 _categoryCode) public view returns (bytes32, address, uint256) {
        PersonalDataEntry storage entry = _getEntry(_borrowerId, _categoryCode);
        return (entry.dataHash, entry.borrowerAppId, entry.updatedTime);
    }

    function size() public view returns (uint256) {
        return keyList.length;
    }

    function getByIndex(uint256 _index) public view returns (address, uint256, bytes32, address, uint256) {
        require(
            keyList.length > 0 && _contains(keyList[_index]),
            "Personal data for both borrower and index is not found"
        );
        bytes32 key = keyList[_index];
        PersonalDataEntry storage entry = entryMap[key];
        return (entry.borrowerId, entry.categoryCode, entry.dataHash, entry.borrowerAppId, entry.updatedTime);
    }

    function getByBorrowerDataListIndex(address _borrowerId, uint256 _index) public view returns (uint256, bytes32, address, uint256) {
        bytes32[] storage borrowerDataKeyList = borrowerToKeyListMap[_borrowerId];
        require(
            borrowerDataKeyList.length > 0 && _contains(borrowerDataKeyList[_index]),
            "Personal data for both borrower and index is not found"
        );
        bytes32 key = keyList[_index];
        PersonalDataEntry storage entry = entryMap[key];
        return (entry.categoryCode, entry.dataHash, entry.borrowerAppId, entry.updatedTime);
    }

    function getBorrowerDataListSize(address _borrowerId) public view returns (uint256) {
        return borrowerToKeyListMap[_borrowerId].length;
    }

    function getByCategoryDataListIndex (uint256 _categoryCode, uint256 _index) public view returns (address, bytes32, address, uint256) {
        bytes32[] storage categoryDataKeyList = categoryCodeToKeyListMap[_categoryCode];
        require(
            categoryDataKeyList.length > 0 && _contains(categoryDataKeyList[_index]),
            "Personal data for both category code and index is not found"
        );
        bytes32 key = categoryDataKeyList[_index];
        PersonalDataEntry storage entry = entryMap[key];
        return (entry.borrowerId, entry.dataHash, entry.borrowerAppId, entry.updatedTime);
    }

    function getCategoryDataListSize(uint256 _categoryCode) public view returns (uint256) {
        return categoryCodeToKeyListMap[_categoryCode].length;
    }

    function remove(address _borrowerId, uint256 _categoryCode) public {
        address borrowerAppId = msg.sender;
        bytes32 key = keccak256(abi.encodePacked(_borrowerId, _categoryCode));
        require(_contains(key), "Personal data for both borrower and category code is not found");

        PersonalDataEntry storage entry = entryMap[key];
        require(
            entry.borrowerAppId == borrowerAppId,
            "msg.sender is not matched borrower app on personal data: only borrower app that added personal data can remove"
        );
        
        bytes32 lastKeyOfList = keyList[keyList.length - 1];
        entryMap[lastKeyOfList].keyListIndex = entry.keyListIndex;
        keyList[entry.keyListIndex] = lastKeyOfList;
        keyList.length--;

        bytes32[] storage categoryDataKeyList = categoryCodeToKeyListMap[_categoryCode];
        bytes32 lastKeyOfCategoryDataList = categoryDataKeyList[categoryDataKeyList.length - 1];
        categoryDataKeyList[entry.categoryCodeToKeyListIndex] = lastKeyOfCategoryDataList;
        entryMap[lastKeyOfList].categoryCodeToKeyListIndex = entry.categoryCodeToKeyListIndex;
        categoryDataKeyList.length--;


        bytes32[] storage borrowerDataKeyList = borrowerToKeyListMap[_borrowerId];
        bytes32 lastKeyOfBorrowerDataList = borrowerDataKeyList[borrowerDataKeyList.length - 1];
        borrowerDataKeyList[entry.borrowerToKeyListIndex] = lastKeyOfBorrowerDataList;
        entryMap[lastKeyOfList].borrowerToKeyListIndex = entry.borrowerToKeyListIndex;
        borrowerDataKeyList.length--;

        delete entryMap[key];
        emit LogPersonalDataDeleted(_borrowerId, _categoryCode, borrowerAppId);
    }
    
    function contains(address _borrowerId, uint256 _categoryCode) public view returns (bool) {
        bytes32 key = keccak256(abi.encodePacked(_borrowerId, _categoryCode));
        return _contains(key);
    }

    function _getEntry(address _borrowerId, uint256 _categoryCode) private view returns (PersonalDataEntry storage) {
        bytes32 key = keccak256(abi.encodePacked(_borrowerId, _categoryCode));
        require(_contains(key), "Personal data for both borrower and category code is not found");
        return entryMap[key];
    }

    function _contains(bytes32 _key) private view returns (bool) {
        return entryMap[_key].updatedTime > 0;
    }

}
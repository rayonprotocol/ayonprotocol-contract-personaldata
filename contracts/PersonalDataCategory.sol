pragma solidity ^0.4.23;

import "../../rayonprotocol-contract-common/contracts/RayonBase.sol";
import "../../rayonprotocol-contract-borrower/contracts/contractReference/UsesBorrowerApp.sol";
import "../../rayonprotocol-contract-borrower/contracts/BorrowerApp.sol";

contract PersonalDataCategory is UsesBorrowerApp, RayonBase {
    struct PersonalDataCategoryEntry {
        uint256 code; // category code is unique
        string category1;
        string category2;
        string category3;
        address borrowerAppId;
        uint256 borrowerAppIdToCodeIndex;
        uint256 score;
        uint8 rewardCycle; // DAILY: 0, WEEKLY: 1, MONTHLY: 2, ANNUALLY: 3,
        uint256 updatedTime;
        uint256 index;
    }

    // list of PersonalDataCategoryEntry code
    uint256[] public codeList;

    mapping (uint256 => PersonalDataCategoryEntry) categoryMap;
    mapping (address => uint256[]) borrowerAppIdToCodeListMap;
    // mapping to manage category compoistion with unique constraint
    mapping (bytes32 => bool) internal compoisiteCategoryToAddedMap;
    
    event LogPersonalDataCategoryAdded(uint256 indexed code, address indexed borrowerAppId);
    event LogPersonalDataCategoryUpdated(uint256 indexed code, string category1, string category2, string category3, uint256 score, uint8 rewardCycle);
    event LogPersonalDataCategoryDeleted(uint256 indexed code, address indexed borrowerAppId);

    // constructor
    constructor(uint16 version) RayonBase("PersonalDataCategory", version) public {}

    function add(uint256 _code, string _category1, string _category2, string _category3, address _borrowerAppId, uint256 _score, uint8 _rewardCycle) public whenBorrowerAppContractIsSet onlyOwner {
        PersonalDataCategoryEntry storage entry = categoryMap[_code];
        // uniqe constraint
        require(!_contains(entry), "Personal data category code already exists");
        require(
            BorrowerApp(borrowerAppContractAddress).contains(_borrowerAppId),
            "Borrower app is not found"
        );
        require(bytes(_category1).length > 0, "Category1 is required");
        require(
            bytes(_category2).length == 0 && bytes(_category3).length == 0
            || bytes(_category2).length > 0,
            "Category2 can not be empty while Category3 exists");
        bytes32 compoisiteCategory = keccak256(abi.encodePacked(_category1, _category2, _category3));
        require(!compoisiteCategoryToAddedMap[compoisiteCategory], "Personal data category composition already exists");
        require(_validateRewardCycle(_rewardCycle),  "Personal data reward cycle is invalid");
        compoisiteCategoryToAddedMap[compoisiteCategory] = true;
        entry.code = _code;
        entry.category1 = _category1;
        entry.category2 = _category2;
        entry.category3 = _category3;
        entry.borrowerAppId = _borrowerAppId;
        entry.borrowerAppIdToCodeIndex = borrowerAppIdToCodeListMap[_borrowerAppId].push(_code) - 1;
        entry.score = _score;
        entry.rewardCycle = _rewardCycle;
        entry.updatedTime = block.timestamp;
        entry.index = codeList.push(_code) - 1;
        emit LogPersonalDataCategoryAdded(_code, _borrowerAppId);
    }

    function update(uint256 _code, string _category1, string _category2, string _category3, uint256 _score, uint8 _rewardCycle) public onlyOwner {
        PersonalDataCategoryEntry storage entry = categoryMap[_code];
        require(_contains(entry), "Personal data category code is not found");
        require(bytes(_category1).length > 0, "Category1 is required");
        require(
            bytes(_category2).length == 0 && bytes(_category3).length == 0
            || bytes(_category2).length > 0,
            "Category2 can not be empty while Category3 exists");
        bytes32 oldCompoisiteCategory = keccak256(abi.encodePacked(entry.category1, entry.category2, entry.category3));
        bytes32 newCompoisiteCategory = keccak256(abi.encodePacked(_category1, _category2, _category3));
        require(
            !compoisiteCategoryToAddedMap[newCompoisiteCategory] || oldCompoisiteCategory == newCompoisiteCategory,
            "Personal data category composition to update already exists");
        require(_validateRewardCycle(_rewardCycle),  "Personal data reward cycle is invalid");
        if (oldCompoisiteCategory != newCompoisiteCategory) {
            compoisiteCategoryToAddedMap[oldCompoisiteCategory] = false;
            compoisiteCategoryToAddedMap[newCompoisiteCategory] = true;
        }
        if (keccak256(abi.encodePacked(entry.category1)) != keccak256(abi.encodePacked(_category1))) entry.category1 = _category1;
        if (keccak256(abi.encodePacked(entry.category2)) != keccak256(abi.encodePacked(_category2))) entry.category2 = _category2;
        if (keccak256(abi.encodePacked(entry.category3)) != keccak256(abi.encodePacked(_category3))) entry.category3 = _category3;
        if (keccak256(abi.encodePacked(entry.score)) != keccak256(abi.encodePacked(_score))) entry.score = _score;
        if (keccak256(abi.encodePacked(entry.rewardCycle)) != keccak256(abi.encodePacked(_rewardCycle))) entry.rewardCycle = _rewardCycle;
        entry.updatedTime = block.timestamp;
        emit LogPersonalDataCategoryUpdated(_code, _category1, _category2, _category3, _score, _rewardCycle);
    }

    function get(uint256 _code) public view returns (uint256, string, string, string, address, uint256, uint8, uint256) {
        PersonalDataCategoryEntry storage entry = categoryMap[_code];
        require(_contains(entry), "Personal data category code is not found");
        return (entry.code, entry.category1, entry.category2, entry.category3, entry.borrowerAppId, entry.score, entry.rewardCycle, entry.updatedTime);
    }

    function getByIndex(uint256 _index) public view returns (uint256, string, string, string, address, uint256, uint8, uint256) {
        require(_isInRange(_index), "Index is out of range of personal data category list");
        uint256 code = codeList[_index];
        
        return get(code);
    }

    function getCodeList() public view returns(uint256[]) {
        return codeList;
    }

    function size() public view returns (uint256) {
        return codeList.length;
    }

    function getByBorrowerAppCodeListIndex(address _borrowerAppId, uint256 _index) public view
    returns (uint256, string, string, string, address, uint256, uint8, uint256) {
        require(_isInRangeOfBorrowerAppCodeList(_borrowerAppId, _index), "Index is out of range of borrower app code list");
        uint256 code = borrowerAppIdToCodeListMap[_borrowerAppId][_index];
        return get(code);
    }

    function getBorrowerAppCodeList(address _borrowerAppId) public view returns (uint256[]) {
        return borrowerAppIdToCodeListMap[_borrowerAppId];
    }

    function getborrowerAppCodeListSize(address _borrowerAppId) public view returns (uint256) {
        return borrowerAppIdToCodeListMap[_borrowerAppId].length;
    }

    /**
     * @dev Remove category identified by code
     * Note that once data category is deregistered, it can be registered newly without any contraint.
     * This may lead unexpected relationship with orphan entries in PersonalDataList.
     */
    function remove(uint256 _code) public onlyOwner {
        PersonalDataCategoryEntry storage entry = categoryMap[_code];
        require(_contains(entry), "Personal data category code is not found");

        address borrowerAppId = entry.borrowerAppId;
        bytes32 compoisiteCategory = keccak256(abi.encodePacked(entry.category1, entry.category2, entry.category3));
        compoisiteCategoryToAddedMap[compoisiteCategory] = false;

        uint256 lastCodeOfList = codeList[codeList.length - 1];
        categoryMap[lastCodeOfList].index = entry.index;
        codeList[entry.index] = lastCodeOfList;
        codeList.length--;

        uint256[] storage borrowerAppCodeList = borrowerAppIdToCodeListMap[borrowerAppId];
        uint256 lastCodeOfBorrowerAppCodeList = borrowerAppCodeList[borrowerAppCodeList.length - 1];
        borrowerAppCodeList[entry.borrowerAppIdToCodeIndex] = lastCodeOfBorrowerAppCodeList;
        categoryMap[lastCodeOfList].borrowerAppIdToCodeIndex = entry.borrowerAppIdToCodeIndex;
        borrowerAppCodeList.length--;

        delete categoryMap[_code];
        emit LogPersonalDataCategoryDeleted(_code, borrowerAppId);
    }

    function getRewardCycleInSecondsByCode(uint256 _code) public view returns (uint256) {
        PersonalDataCategoryEntry storage entry = categoryMap[_code];
        require(_contains(entry), "Personal data category code is not found");
        if (entry.rewardCycle == 0) return 1 days;
        else if (entry.rewardCycle == 1) return 1 weeks;
        else if (entry.rewardCycle == 2) return 30 days;
        else if (entry.rewardCycle == 3) return 365 days;
    }
    
    function contains(uint256 _code) public view returns (bool) {
        PersonalDataCategoryEntry storage entry = categoryMap[_code];
        return _contains(entry);
    }

    function _validateRewardCycle(uint8 _rewardCycle) private pure returns (bool) {
        return _rewardCycle >= 0 && _rewardCycle < 4;
    }

    function _contains(PersonalDataCategoryEntry entry) private pure returns (bool) {
        return entry.borrowerAppId != address(0);
    }

    function _isInRange(uint256 _index) private view returns (bool) {
        return (_index >= 0) && (_index < codeList.length);
    }

    function _isInRangeOfBorrowerAppCodeList(address _borrowerAppId, uint256 _index) private view returns (bool) {
        return (_index >= 0) && (_index < borrowerAppIdToCodeListMap[_borrowerAppId].length);
    }
}
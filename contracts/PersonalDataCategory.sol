pragma solidity ^0.4.23;

import "../../rayonprotocol-contract-common/contracts/RayonBase.sol";
import "../../rayonprotocol-contract-borrower/contracts/contractReference/UsesBorrowerApp.sol";
import "../../rayonprotocol-contract-borrower/contracts/BorrowerApp.sol";

contract PersonalDataCategory is UsesBorrowerApp, RayonBase {
    struct PersonalDataCategoryEntry {
        uint256 code; // category code is unique
        bytes32 category1;
        bytes32 category2;
        bytes32 category3;
        address borrowerAppId;
        uint256 borrowerAppIdToCodeIndex;
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
    event LogPersonalDataCategoryUpdated(uint256 indexed code, bytes32 category1, bytes32 category2, bytes32 category3);

    // constructor
    constructor(uint16 version) RayonBase("PersonalDataCategory", version) public {}

    function add(uint256 _code, bytes32 _category1, bytes32 _category2, bytes32 _category3, address _borrowerAppId) public whenBorrowerAppContractIsSet onlyOwner {
        PersonalDataCategoryEntry storage entry = categoryMap[_code];
        // uniqe constraint
        require(!_contains(entry), "Personal data category code already exists");
        require(
            BorrowerApp(borrowerAppContractAddress).contains(_borrowerAppId),
            "Borrower app is not found"
        );
        bytes32  compoisiteCategory = keccak256(abi.encodePacked(_category1, _category2, _category3));
        require(!compoisiteCategoryToAddedMap[compoisiteCategory], "Personal data category composition is already exists");

        compoisiteCategoryToAddedMap[compoisiteCategory] = true;
        entry.code = _code;
        entry.category1 = _category1;
        entry.category2 = _category2;
        entry.category3 = _category3;
        entry.borrowerAppId = _borrowerAppId;
        entry.borrowerAppIdToCodeIndex = borrowerAppIdToCodeListMap[_borrowerAppId].push(_code) - 1;
        entry.updatedTime = block.timestamp;
        entry.index = codeList.push(_code) - 1;
        emit LogPersonalDataCategoryAdded(_code, _borrowerAppId);
    }

    function update(uint256 _code, bytes32 _category1, bytes32 _category2, bytes32 _category3) public onlyOwner {
        PersonalDataCategoryEntry storage entry = categoryMap[_code];
        require(_contains(entry), "Personal data category code is not found");
        
        bytes32  compoisiteCategory = keccak256(abi.encodePacked(_category1, _category2, _category3));
        require(!compoisiteCategoryToAddedMap[compoisiteCategory], "Personal data category composition to update is already exists");

        compoisiteCategoryToAddedMap[compoisiteCategory] = true;
        if (entry.category1 != _category1) entry.category1 = _category1;
        if (entry.category2 != _category2) entry.category2 = _category2;
        if (entry.category3 != _category3) entry.category3 = _category3;
        entry.updatedTime = block.timestamp;
        emit LogPersonalDataCategoryUpdated(_code, _category1, _category2, _category3);
    }

    function get(uint256 _code) public view returns (uint256, bytes32, bytes32, bytes32, address, uint256) {
        PersonalDataCategoryEntry storage entry = categoryMap[_code];
        require(_contains(entry), "Personal data category code is not found");
        return (entry.code, entry.category1, entry.category2, entry.category3, entry.borrowerAppId,  entry.updatedTime);
    }

    function getByIndex(uint256 _index) public view returns (uint256, bytes32, bytes32, bytes32, address, uint256) {
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
    returns (uint256, bytes32, bytes32, bytes32, address, uint256) {
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
    

    function contains(uint256 _code) public view returns (bool) {
        PersonalDataCategoryEntry storage entry = categoryMap[_code];
        return _contains(entry);
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
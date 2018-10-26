pragma solidity ^0.4.23;

import "./UsesPersonalDataCategory.sol";

contract UsesPersonalDataCategoryImpl is UsesPersonalDataCategory {
    function doSomething() public whenPersonalDataCategoryContractIsSet view returns (bool) {
        return true;
    }
}
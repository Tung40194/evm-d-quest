// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// converting bytes to other types
library BytesConversion {
    function toUint256(bytes memory data) public pure returns (uint256) {
        uint256 result;
        assembly {
            result := mload(add(data, 32))
        }
        return result;
    }

    function toAddress(bytes memory data) public pure returns (address addr) {
        assembly {
            addr := mload(add(data, 20))
        }
    }

    function toString(bytes memory data) public pure returns (string memory) {
        return string(data);
    }
}

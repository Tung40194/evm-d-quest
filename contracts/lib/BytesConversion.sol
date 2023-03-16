// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// converting bytes to other types
library BytesConversion {
    function toUint256(bytes memory data) internal pure returns (uint256) {
        uint256 result;
        assembly {
            result := mload(add(data, 32))
        }
        return result;
    }

    function toAddress(bytes memory data) internal pure returns (address addr) {
        assembly {
            addr := mload(add(data, 20))
        }
    }

    function toString(bytes memory data) internal pure returns (string memory) {
        return string(data);
    }
}

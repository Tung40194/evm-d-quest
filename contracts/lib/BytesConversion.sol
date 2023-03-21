// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// converting bytes to other types
library BytesConversion {
    function toUint256(bytes memory data) internal pure returns (uint256) {
        (uint256 decodedUint256) = abi.decode(data, (uint256));
        return decodedUint256;
    }

    function toAddress(bytes memory data) internal pure returns (address addr) {
        (address decodedAddress) = abi.decode(data, (address));
        return decodedAddress;
    }

    function toString(bytes memory data) internal pure returns (string memory) {
        (string memory decodedString) = abi.decode(data, (string));
        return decodedString;
    }
}
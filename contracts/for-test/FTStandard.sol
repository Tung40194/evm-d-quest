// SPDX-License-Identifier: MIT
/*
 * Error message map.
 * FS1 : Receivers and amounts must be the same length
 */
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract FTStandard is ERC20, ERC20Burnable, AccessControlEnumerable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev The version of this standard template
    uint256 public constant version = 1;

    // @notice The token's decimals
    uint8 private immutable DECIMALS;

    // @notice Constructor of ERC20 token
    // @dev Grants DEFAULT_ADMIN_ROLE and MINTER_ROLE to deployer (msg.sender)
    // @param _name name of the token
    // @param _symbol symbol of the token
    // @param _decimals decimals of the token
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) ERC20(_name, _symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        DECIMALS = _decimals;
    }

    // @notice The token's decimals
    function decimals() public view override returns (uint8) {
        return DECIMALS;
    }

    // @notice Mints the token to a single receiver
    // @dev Only MINTER_ROLE can mint
    // @param _to An address of the receiver
    // @param _amount An amount mint to the receiver
    function mint(address _to, uint256 _amount) public onlyRole(MINTER_ROLE) {
        _mint(_to, _amount);
    }

    // @notice Mints the token to multiple receivers. Nth address of _to will receive Nth amount of _amount array.
    // @dev Only MINTER_ROLE can mint and the length of _to and _amount array must be the same.
    // @param _to[] An array address of the receivers
    // @param _amount[] An array of amounts to mint per receiver
    function mintBatch(address[] memory _to, uint256[] memory _amount)
        public
        onlyRole(MINTER_ROLE)
    {
        require(_to.length == _amount.length, "FS1");
        for (uint256 i = 0; i < _to.length; ++i) {
            mint(_to[i], _amount[i]);
        }
    }

    // @notice Transfer the DEFAULT_ADMIN_ROLE to another account
    // @dev Only DEFAULT_ADMIN_ROLE can transfer their default admin role to another account
    // @param _account Target address of the transfer.
    function transferDefaultAdminRole(address _account)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _account);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
}

// SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "@openzeppelin/contracts-v0.7/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-v0.7/token/ERC20/IERC20.sol";

interface ITypeAndVersion {
    /**
     * @dev Returns type and version for the contract.
     *
     * The returned string has the following format: <contract name><SPACE><semver>
     * Try to keep its length less than 32 to take up less contract space.
     */
    function typeAndVersion() external pure returns (string memory);
}

abstract contract LinkERC20 is ERC20 {
    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseApproval(address spender, uint256 addedValue) public virtual returns (bool) {
        return super.increaseAllowance(spender, addedValue);
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseApproval(address spender, uint256 subtractedValue) public virtual returns (bool) {
        return super.decreaseAllowance(spender, subtractedValue);
    }
}

interface IERC677 is IERC20 {
    function transferAndCall(address to, uint value, bytes memory data) external returns (bool success);

    event Transfer667(address indexed from, address indexed to, uint value, bytes data);
}

interface IERC677Receiver {
    function onTokenTransfer(address sender, uint value, bytes memory data) external;
}

abstract contract ERC677 is IERC677, ERC20 {
    /**
     * @dev transfer token to a contract address with additional data if the recipient is a contact.
     * @param to The address to transfer to.
     * @param value The amount to be transferred.
     * @param data The extra data to be passed to the receiving contract.
     */
    function transferAndCall(address to, uint value, bytes memory data) public virtual override returns (bool success) {
        super.transfer(to, value);
        emit Transfer667(msg.sender, to, value, data);
        if (isContract(to)) {
            contractFallback(to, value, data);
        }
        return true;
    }

    // PRIVATE

    function contractFallback(address to, uint value, bytes memory data) private {
        IERC677Receiver receiver = IERC677Receiver(to);
        receiver.onTokenTransfer(msg.sender, value, data);
    }

    function isContract(address addr) private view returns (bool hasCode) {
        uint length;
        assembly {
            length := extcodesize(addr)
        }
        return length > 0;
    }
}

contract LinkToken is ITypeAndVersion, LinkERC20, ERC677 {
    uint private constant TOTAL_SUPPLY = 10 ** 27;
    string private constant NAME = "ChainLink Token";
    string private constant SYMBOL = "LINK";

    constructor() ERC20(NAME, SYMBOL) {
        _onCreate();
    }

    /**
     * @notice versions:
     *
     * - LinkToken 0.0.3: added versioning, update name
     * - LinkToken 0.0.2: upgraded to solc 0.6
     * - LinkToken 0.0.1: initial release solc 0.4
     *
     * @inheritdoc ITypeAndVersion
     */
    function typeAndVersion() external pure virtual override returns (string memory) {
        return "LinkToken 0.0.3";
    }

    /**
     * @dev Hook that is called when this contract is created.
     * Useful to override constructor behaviour in child contracts (e.g., LINK bridge tokens).
     * @notice Default implementation mints 10**27 tokens to msg.sender
     */
    function _onCreate() internal virtual {
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    /**
     * @dev Check if recepient is a valid address before transfer
     * @inheritdoc ERC20
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override validAddress(recipient) {
        super._transfer(sender, recipient, amount);
    }

    /**
     * @dev Check if spender is a valid address before approval
     * @inheritdoc ERC20
     */
    function _approve(address owner, address spender, uint256 amount) internal virtual override validAddress(spender) {
        super._approve(owner, spender, amount);
    }

    /**
     * @dev Check if recipient is valid (not this contract address)
     * @param recipient the account we transfer/approve to
     */
    modifier validAddress(address recipient) virtual {
        require(recipient != address(this), "LinkToken: transfer/approve to this contract address");
        _;
    }
}

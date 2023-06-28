// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract BatchTransfer is Ownable {
    //libraries
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    //state variables
    bytes32 public immutable merkleRoot;
    IERC20 public token;
    mapping (address => bool) public hasAirdropped;

    //events
    event Airdropped(address indexed user, uint256 indexed amount);
    event WithdrawBalance(address indexed owner, uint256 indexed balance);

    constructor(address _token, bytes32 _merkleRoot) {
        token = IERC20(_token);
        merkleRoot = _merkleRoot;
    }

    //function to batch transfer (up to 100 addresses at a time)
    function batchTransfer(
        address[] calldata _recipients, 
        uint256 _amount,
        bytes32[][] calldata _merkleProofs
    ) public onlyOwner{
        uint256 arrayLength = _recipients.length;
        require(arrayLength > 0, "Number of recipients is zero");
        require(arrayLength <= 100, "Too many addresses for transfer");
        require(arrayLength == _merkleProofs.length, "Number of proofs does not match number of recipients");

        uint256 totalTransferAmount = _amount * arrayLength;
        require(totalTransferAmount <= token.balanceOf(address(this)), "Insufficient balance in contract");

        for (uint256 i = 0; i < arrayLength; ) {
            address recipient = _recipients[i];
            bytes32[] memory merkleProof = _merkleProofs[i];
            bytes32 node = keccak256(abi.encodePacked(recipient));
            require(MerkleProof.verify(merkleProof, merkleRoot, node), "Invalid Merkle Proof");
            
            require(!hasAirdropped[recipient], "Already airdropped to recipient");
            token.safeTransfer(recipient, _amount);
            hasAirdropped[recipient] = true;

            emit Airdropped(recipient, _amount);
            unchecked {
                i++;
            }
        }
    }

    //function to withdraw contract balance
    function withdrawBalance() external onlyOwner {
        uint256 contractBalance = token.balanceOf(address(this));
        require(contractBalance > 0, "Contract balance is zero.");
        token.safeTransfer(msg.sender, contractBalance);
        
        emit WithdrawBalance(msg.sender, contractBalance);
    }

    //function to update token
    function updateTokenContract(address _new) external onlyOwner {
        token = IERC20(_new);
    }
}
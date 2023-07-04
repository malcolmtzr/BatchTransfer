const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const contractABI = require("./abi/batchTransferAbi.json");
const contractAddress = "0xBFdd28e0d3602E73aFfF2a24E4b1f66C1Ae0ec86";
const fs = require("fs");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
require("dotenv").config();

//Web3 dependencies
const provider = new HDWalletProvider({
    mnemonic: process.env.MAINNETMNEMONIC,
    providerOrUrl: process.env.AVALANCHEMAINNETURL,
    addressIndex: 0
});
const web3 = new Web3(provider);
const contract = new web3.eth.Contract(contractABI, contractAddress);

//batchTransfer function
async function executeBatchTransfer(recipients, amount, merkleProofs) {
    const accounts = await web3.eth.getAccounts();
    const sender = accounts[0];
    try {
        const transaction = contract.methods.batchTransfer(recipients, amount, merkleProofs);
        const txnData = transaction.encodeABI();
        const gasPrice = await web3.eth.getGasPrice();
        const gasLimit = 10000000;
        const nonce = await web3.eth.getTransactionCount(sender);

        const rawTransaction = {
            from: sender,
            to: contractAddress,
            data: txnData,
            gas: gasLimit,
            gasPrice: gasPrice,
            nonce: nonce,
        };
        const signedTx = await web3.eth.accounts.signTransaction(
            rawTransaction,
            process.env.PRIVKEYS,
        );
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log("Tx hash: " + receipt.transactionHash)

    } catch (error) {
        console.error("Error: " + error.message);
    }
}

//Airdrop amount
const amount = web3.utils.toWei("5", "ether");

//Addresses
const csv = fs.readFileSync("Addresslist-airdropsmallbava-final.csv");
const addrArray = csv.toString().replace(/(\r\n|\n|\r)/gm, " ").split(" ");
console.log("Number of addresses: " + addrArray.length);

//Generate merkle proofs for all addreses -> merkleProofs = [][]
let merkleProofs = [];
let leafNodes = addrArray.map(addr => keccak256(addr));
let merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
addrArray.forEach(addr => {
    const addrHash = keccak256(addr);
    const proof = merkleTree.getHexProof(addrHash);
    merkleProofs.push(proof);
})

// const firstAddr = addrArray[0];
// let firstAddrArr = []
// firstAddrArr.push(firstAddr);
// let firstMpArr = [];
// firstMpArr.push(merkleProofs[0])
// console.log(firstAddrArr);
// console.log(firstMpArr);

const batchOne = addrArray.slice(1, 101);
const batchTwo = addrArray.slice(101, 201);
const batchThree = addrArray.slice(201, 301);
const batchFour = addrArray.slice(301, 401);
const batchFive = addrArray.slice(401);

const batchOneMp = merkleProofs.slice(1, 101);
const batchTwoMp = merkleProofs.slice(101, 201);
const batchThreeMp = merkleProofs.slice(201, 301);
const batchFourMp = merkleProofs.slice(301, 401);
const batchFiveMp = merkleProofs.slice(401);

// console.log(batchOne.length);
// console.log(batchTwo.length);
// console.log(batchThree.length);
// console.log(batchFour.length);
// console.log(batchFive.length);
// console.log(" ");
// console.log(batchOneMp.length);
// console.log(batchTwoMp.length);
// ;console.log(batchThreeMp.length);
// console.log(batchFourMp.length);
// console.log(batchFiveMp.length);

const main = async () => {
    // await executeBatchTransfer(batchOne, amount, batchOneMp);

    // await executeBatchTransfer(batchTwo, amount, batchTwoMp);

    // await executeBatchTransfer(batchThree, amount, batchThreeMp);

    // await executeBatchTransfer(batchFour, amount, batchFourMp);

    // await executeBatchTransfer(batchFive, amount, batchFiveMp);

    console.log("Batch Transfer complete");
}

main();

// Exit node Ctrl-C

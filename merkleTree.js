const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const fs = require("fs");

const csv = fs.readFileSync("Addresslist-airdropsmallbava-final.csv");
//const csv = fs.readFileSync("testaddresses.csv");
const addrArray = csv.toString().replace(/(\r\n|\n|\r)/gm, " ").split(" ");
console.log("Number of addresses: " + addrArray.length);

const leafNodes = addrArray.map(addr => keccak256(addr));
const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });

console.log("")
console.log("Merkle Root: " + merkleTree.getHexRoot());

const merkleProofs = [];
addrArray.forEach(addr => {
    const addrHash = keccak256(addr);
    const proof = merkleTree.getHexProof(addrHash);
    merkleProofs.push(proof);
})

console.log("-------");
//  console.log(merkleProofs)



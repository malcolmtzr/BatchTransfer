const BatchTransfer = artifacts.require("BatchTransfer");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const fs = require("fs");

contract("BatchTransfer", (accounts) => {

    let testAddresses = []
    let leafNodes;
    let merkleTree;
    let merkleRoot;
    let merkleProofs = []
    let batchTransferInstance;

    before(async () => {
        const csv = fs.readFileSync("testaddresses.csv");
        testAddresses = csv.toString().replace(/(\r\n|\n|\r)/gm, " ").split(" ");
        leafNodes = testAddresses.map(addr => keccak256(addr));
        merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
        merkleRoot = merkleTree.getHexRoot();
        testAddresses.forEach(addr => {
            const addrHash = keccak256(addr);
            const proof = merkleTree.getHexProof(addrHash);
            merkleProofs.push(proof);
        })
        batchTransferInstance = await BatchTransfer.at("0xF2EFbb84C4045A5e88f0c023f47F98885826Efb6");
    });

    it("Has the correct owner", async () => {
        console.log(batchTransferInstance.address);
        const owner = await batchTransferInstance.owner.call();
        assert.equal(owner, accounts[0], "Owner incorrect");
    })

    it("Has the correct token address (testnet)", async () => {
        //Testing with USDC on avalanche testnet
        const token = await batchTransferInstance.token.call();
        assert.equal(token, "0x5425890298aed601595a70AB815c96711a31Bc65", "Wrong token address");
    });

    it("Should not allow non-owner to perform airdrop", async () => {
        try {
            await batchTransferInstance.batchTransfer(
                testAddresses,
                10000,
                merkleProofs,
                { 
                    from: accounts[1],
                    gas: 10000000 
                }
            );
            assert.fail("Non-owner was able to perform batchTransfer");
        } catch (error) {
            assert.include(
                error.message,
                "exited with an error",
                "Expected error message not received"
            );
        }
    });

    it("Should not allow non-whitelisted addresses to receive airdrop", async () => {
        const nonWhitelistAddrs = [
            "0x0bb9c5a797007d84f15258147D62b31780C677f6",
            "0x785ADb8Da26B59dBA00861f7559613724f3A0Db7",
            "0x5Db3544DEa75DeCfE0dd71DC1b4ef42E27d0736f"
        ]; 
        const testLeafNodes = nonWhitelistAddrs.map(addr => keccak256(addr));
        const testMerkleTree = new MerkleTree(testLeafNodes, keccak256, { sortPairs: true });
        let testMerkleProofs = []
        nonWhitelistAddrs.forEach(addr => {
            const addrHash = keccak256(addr);
            const proof = testMerkleTree.getHexProof(addrHash);
            testMerkleProofs.push(proof);
        })
        try {
            await batchTransferInstance.batchTransfer(
                nonWhitelistAddrs,
                10000,
                testMerkleProofs,
                { 
                    from: accounts[0],
                    gas: 10000000
                }
            )
            assert.fail("Non whitelisted addresses were able to get airdrop");
        } catch (error) {
            assert.include(
                error.message,
                "exited with an error",
                "Expected error message not received"
            );
        }
    });

    it("Should not allow batch transfers with invalid merkle proofs", async () => {
        const recipient = testAddresses[50];
        try {
            await batchTransferInstance.batchTransfer(
                recipient,
                10000,
                [[  
                    "0xinvalidMerkleProof",
                    "0xinvalidMerkleProof", 
                    "0xinvalidMerkleProof", 
                    "0xinvalidMerkleProof"
                ]],
                { from: accounts[0] }
            )
            assert.fail("Batch transfer with invalid proof was allowed");
        } catch (error) {
            assert.include(
                error.message,
                "expected array value",
                "Expected error message not received"
            );
        }
    });

    it("Should not allow non-owner to withdraw contract balance", async () => {
        try {
            await batchTransferInstance.withdrawBalance(
                { from: accounts[1] }
            );
            assert.fail("Non owner was able to withdraw contract balance");
        } catch (error) {
            assert.include(
                error.message,
                "exited with an error",
                "Expected error message not received"
            )
        }
    });

    it("Should set hasAirdropped to true for 100 addresses", async () => {
        await batchTransferInstance.batchTransfer(
            testAddresses,
            10000,
            merkleProofs,
            { 
                from: accounts[0],
                gas: 10000000 
            }
        );

        for (let i = 0; i < testAddresses.length; i++) {
            const hasAirdropped = await batchTransferInstance.hasAirdropped(testAddresses[i]);
            assert.isTrue(hasAirdropped, "hasAirdropped should be true for all recipients");
        }
    });

    it("Recipients should have the correct airdropped amount", async () => {
        const proxyAddress = "0x5425890298aed601595a70AB815c96711a31Bc65";
        const tokenAbi = require("../abi/testUSDCAbi.json");
        const proxyContract = new web3.eth.Contract(tokenAbi, proxyAddress);;

        for (let i = 0; i < testAddresses.length; i++) {
            const recipientBalance = await proxyContract.methods.balanceOf(testAddresses[i]).call();
            //Consider if batchTransfer was done previously, each round is 0.01 USDC
            assert.equal(recipientBalance, "40000", "Recipients should have 0.04 USDC");
        }

    });

    it("Should allow owner to withdraw contract balance", async () => {
        try {
            await batchTransferInstance.withdrawBalance(
                { from: accounts[0] }
            );
            assert.isOk("Owner withdrew contract balance");
        } catch (error) {
            assert.include(
                error.message,
                "exited with an error",
                "Expected error message not received"
            );
        }
    })
});
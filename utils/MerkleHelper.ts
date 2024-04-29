import {ethers} from "hardhat";
import {MerkleTree} from "merkletreejs";
import keccak256 from "keccak256";

const abiCoder = ethers.AbiCoder.defaultAbiCoder();
export interface MerkleNode {
    address: string;
    amount: bigint;
}

export class MerkleHelper {
    static getProofMerkle(arrayAddress: string[], addressWallet: string) {
        const leafNodes = arrayAddress.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
        const claimingAddress = keccak256(addressWallet);
        return merkleTree.getHexProof(claimingAddress);
    }

    static getRoot = (arrayAddress: string[]) => {
        const leafNodes = arrayAddress.map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
        return merkleTree.getHexRoot();
    };

    static getProofAddressAmountMerkle(addressAmountPairs: MerkleNode[], addressAmount: MerkleNode) {
        const leafNodes = addressAmountPairs.map(({address, amount}) => {
            return keccak256(abiCoder.encode(["address", "uint256"], [address, amount]));
        });
        const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});

        const claimingAddress = abiCoder.encode(["address", "uint256"], [addressAmount.address, addressAmount.amount]);
        return merkleTree.getHexProof(keccak256(claimingAddress));
    }

    static getRootAddressAmount = (addressAmountPairs: MerkleNode[]) => {
        const leafNodes = addressAmountPairs.map(({address, amount}) => {
            return keccak256(abiCoder.encode(["address", "uint256"], [address, amount]));
        });

        const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
        return merkleTree.getHexRoot();
    };
}

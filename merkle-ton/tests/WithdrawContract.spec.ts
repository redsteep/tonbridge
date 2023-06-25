import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, beginCell, toNano } from 'ton-core';
import { WithdrawContract } from '../wrappers/WithdrawContract';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { utils } from "web3";

describe('WithdrawContract', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('WithdrawContract');
    });

    let blockchain: Blockchain;
    let withdrawContract: SandboxContract<WithdrawContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        // blockchain.verbosity = {
        //     print: true,
        //     blockchainLogs: true,
        //     vmLogs: 'vm_logs',
        //     debugLogs: true,
        // }

        withdrawContract = blockchain.openContract(
            WithdrawContract.createFromConfig(
                {
                    id: 0,
                    counter: 0,
                },
                code
            )
        );

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await withdrawContract.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: withdrawContract.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and withdrawContract are ready to use
    });

    const hash = (x: bigint) => {
        let cell = 
            beginCell()
                .storeUint(x, 256)
            .endCell();
        let buf = cell.asSlice().loadBuffer(cell.asSlice().remainingBits/8);
        return BigInt(utils.keccak256(
            Uint8Array.from(buf)
        ));
    };

    const pairHash = (a: bigint, b: bigint) => hash(hash(a)^hash(b));
    
    const empty = 0n;

    const oneLevelUp = (inputArray: bigint[]) => {
        var result = [];
        var inp = [...inputArray];

        if (inp.length % 2 == 1)
            inp.push(empty);
        for (var i = 0; i < inp.length; i += 2) {
            result.push(pairHash(inp[i], inp[i+1]));
        }
        return result;
    }

    const getMerkleRoot = (inputArray: bigint[]) => {
        var result
        result = [...inputArray];
        for (let i = 0; i < 30; i++) {
            result = oneLevelUp(result);
        }
        return result[0];
    }

    const getMerkleProof = (inputArray: bigint[], n: number) => {
        var result = [], currentLayer = [...inputArray], currentN = n;
        for (let i = 0; i < 30; i++) {
            if (currentLayer.length % 2 == 1) currentLayer.push(empty);
            result.push(currentN % 2 ? currentLayer[currentN-1] : currentLayer[currentN+1]);
            currentN = Math.floor(currentN/2);
            currentLayer = oneLevelUp(currentLayer);
        }
        return result;
    }


    it('should update root', async () => {
        const arr = [BigInt(3), BigInt(1), BigInt(2), BigInt(4), BigInt(5)];
        const root = getMerkleRoot(arr);

        const updater = await blockchain.treasury('updater' + 0);

        const updResult = await withdrawContract.sendUpdateMerkleRoot(
            updater.getSender(), {
                newRoot: root,
                value: toNano('0.5'),
            }
        )

        expect(updResult.transactions).toHaveTransaction({
            from: updater.address,
            to: withdrawContract.address,
            success: true,
        });

        const rootAfter = await withdrawContract.getMerkleRoot();

        expect(rootAfter).toBe(root);
    });

    it('should check proof', async() => {
        const arr = [BigInt(3), BigInt(1), BigInt(2), BigInt(4), BigInt(5)];
        const root = getMerkleRoot(arr);

        const updater = await blockchain.treasury('updater' + 0);

        const updResult = await withdrawContract.sendUpdateMerkleRoot(
            updater.getSender(), {
                newRoot: root,
                value: toNano('0.5'),
            }
        )

        expect(updResult.transactions).toHaveTransaction({
            from: updater.address,
            to: withdrawContract.address,
            success: true,
        });

        let tx_id = arr[2];
        let proof = getMerkleProof(arr, 2);

        let val = tx_id;
        for (let i = 0; i < proof.length; i++)
            val = pairHash(val, proof[i]);

        const checkResult = await withdrawContract.sendCheckProof(
            updater.getSender(), {
                tx_id,
                proof,
                value: toNano('0.5')
            }
        );

        expect(checkResult.transactions).toHaveTransaction({
            from: updater.address,
            to: withdrawContract.address,
            success: true
        })
    });

});

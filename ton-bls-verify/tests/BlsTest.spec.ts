import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { BlsTest } from '../wrappers/BlsTest';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

import verifyTest from './verify.json';

describe('BlsTest', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('BlsTest');
    });

    let blockchain: Blockchain;
    let blsTest: SandboxContract<BlsTest>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        // blockchain.verbosity = {
        //     print: true,
        //     blockchainLogs: true,
        //     vmLogs: 'vm_logs',
        //     debugLogs: true,
        // }

        blsTest = blockchain.openContract(BlsTest.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await blsTest.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: blsTest.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and blsTest are ready to use
    });

    it('should accept or reject verification', async () => {
        for (var i = 0; i < verifyTest.length; i++) {
            var pkString = verifyTest[i].input.pubkey;
            var msgString = verifyTest[i].input.message;
            var sgnString = verifyTest[i].input.signature;
            var outputBool = verifyTest[i].output;

            console.log(`test ${i + 1}/${verifyTest.length}`);

            const verifier = await blockchain.treasury('verifier' + i);

            var pk = Buffer.from(pkString.substring(2), "hex");
            var msg = Buffer.from(msgString.substring(2), "hex");
            var sgn = Buffer.from(sgnString.substring(2), "hex");
            var output = outputBool == true ? 1 : 0;
            const verifyResult = await blsTest.sendVerify(verifier.getSender(), {
                msgSize: msg.length,
                pk: pk,
                msg: msg,
                sgn: sgn,
                value: toNano('10'),
            });

            expect(verifyResult.transactions).toHaveTransaction({
                from: verifier.address,
                to: blsTest.address,
                success: true,
            });


            const res = await blsTest.getRes();

            expect(res).toEqual(output);

        }
    });
});

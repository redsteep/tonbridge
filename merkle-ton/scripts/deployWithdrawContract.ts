import { toNano } from 'ton-core';
import { WithdrawContract } from '../wrappers/WithdrawContract';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const withdrawContract = provider.open(
        WithdrawContract.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('WithdrawContract')
        )
    );

    await withdrawContract.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(withdrawContract.address);

    console.log('ID', await withdrawContract.getID());
}

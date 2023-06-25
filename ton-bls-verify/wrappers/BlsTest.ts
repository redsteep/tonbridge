import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type BlsTestConfig = {};

export function blsTestConfigToCell(config: BlsTestConfig): Cell {
    return beginCell().endCell();
}

export const Opcodes = {
    increase: 0x3b3cca17,
};


export class BlsTest implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new BlsTest(address);
    }

    static createFromConfig(config: BlsTestConfig, code: Cell, workchain = 0) {
        const data = blsTestConfigToCell(config);
        const init = { code, data };
        return new BlsTest(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendVerify(
        provider: ContractProvider,
        via: Sender,
        opts: {
            msgSize: number;
            pk: Buffer;
            msg: Buffer;
            sgn: Buffer;
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.increase, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.msgSize, 32)
                .storeBuffer(opts.pk, 48)
                .storeRef(
                    beginCell()
                    .storeBuffer(opts.msg, opts.msgSize)
                    .storeRef(
                        beginCell()
                        .storeBuffer(opts.sgn, 96)
                        .endCell()
                    )
                    .endCell()
                )
                .endCell(),
        });
    }


    async getRes(provider: ContractProvider) {
        const result = await provider.get('get_res', []);
        return result.stack.readNumber();
    }
}

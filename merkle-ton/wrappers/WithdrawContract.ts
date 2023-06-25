import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type WithdrawContractConfig = {
    id: number;
    counter: number;
};

export function withdrawContractConfigToCell(config: WithdrawContractConfig): Cell {
    return beginCell().storeUint(config.id, 32).storeUint(config.counter, 32).endCell();
}

export const Opcodes = {
    update_root: 0x412d7c98,
    check_proof: 0xe216a143,
};

export class WithdrawContract implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new WithdrawContract(address);
    }

    static createFromConfig(config: WithdrawContractConfig, code: Cell, workchain = 0) {
        const data = withdrawContractConfigToCell(config);
        const init = { code, data };
        return new WithdrawContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendUpdateMerkleRoot(
        provider: ContractProvider,
        via: Sender,
        opts: {
            newRoot: bigint;
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.update_root, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.newRoot, 256)
                .endCell(),
        });
    }

    genProofCell(proof: bigint[]) : Cell {
        if (proof.length == 1) {
            return beginCell()
                .storeUint(proof[0], 256)
                .endCell();
        } else {
            return beginCell()
                .storeUint(proof[0], 256)
                .storeRef(this.genProofCell(proof.slice(1)))
                .endCell();
        }
    }

    async sendCheckProof(
        provider: ContractProvider,
        via: Sender,
        opts: {
            tx_id: bigint;
            proof: bigint[];
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.check_proof, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.tx_id, 256)
                .storeRef(this.genProofCell(opts.proof))
                .endCell(),
        });
    }


    async getMerkleRoot(provider: ContractProvider) {
        const result = await provider.get('get_merkle_root', []);
        console.log(result.stack.peek().type);
        return result.stack.readBigNumber();
    }
}

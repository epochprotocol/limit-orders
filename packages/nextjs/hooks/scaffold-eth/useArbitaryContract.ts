import { Account, Address, Chain, Transport, getContract } from "viem";
import { PublicClient, usePublicClient } from "wagmi";
import { GetWalletClientResult } from "wagmi/actions";
import { Contract, ContractName } from "~~/utils/scaffold-eth/contract";

/**
 * Gets a deployed contract by contract name and returns a contract instance
 * @param config - The config settings
 * @param config.contractName - Deployed contract name
 * @param config.walletClient - An viem wallet client instance (optional)
 */
export const useArbitaryContract = <
    TContractName extends ContractName,
    TWalletClient extends Exclude<GetWalletClientResult, null> | undefined,
>({
    contractName,
    contractAddress,
    abi,
    walletClient,
}: {
    contractName: TContractName;
    walletClient?: TWalletClient | null;
    contractAddress: string;
    abi: any
}) => {

    const publicClient = usePublicClient();

    let contract = undefined;

    contract = getContract<
        Transport,
        Address,
        Contract<TContractName>["abi"],
        Chain,
        Account,
        PublicClient,
        TWalletClient
    >({
        address: contractAddress,
        abi: abi,
        walletClient: walletClient ? walletClient : undefined,
        publicClient,
    });

    return {
        data: contract,
    };
};

import { Abi, Narrow } from "viem";
import { useContractRead } from "wagmi";
import { useTargetNetwork } from "./useTargetNetwork";

interface UseArbitaryContractRead {
    contractAddress: string,
    abi: Narrow<Abi | readonly unknown[]> | undefined,
    functionName: string,
    args: readonly unknown[] | undefined
}

/**
 * Wrapper for wagmi's useContractRead hook which automatically loads (by name)
 * the contract ABI and address from the deployed contracts
 * @param config - The config settings, including extra wagmi configuration
 * @param config.contractName - deployed contract name
 * @param config.functionName - name of the function to be called
 * @param config.args - args to be passed to the function call
 */
export const useArbitaryContractRead = ({ contractAddress,
    abi,
    functionName,
    args
}: UseArbitaryContractRead
) => {

    const { targetNetwork } = useTargetNetwork();

    return useContractRead({
        chainId: targetNetwork.id,
        functionName,
        address: contractAddress,
        abi,
        args,
        enabled: !Array.isArray(args) || !args.some(arg => arg === undefined),
    });
};

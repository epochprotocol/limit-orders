// api.js
import { useArbitaryContract } from "./useArbitaryContract";
import { gql, request } from "graphql-request";
import { useQuery } from "react-query";
import { decodeFunctionData } from "viem";
import { useWalletClient } from "wagmi";
import SimpleAccountABI from "~~/contracts/SimpleAccountABI";
import UniswapV2Router02ABI from "~~/contracts/UniswapV2Router02ABI";

const GRAPHQL_ENDPOINT = "https://api.thegraph.com/subgraphs/name/lazycoder1/mumbai-aa-indexer";

const GET_USER_OPS = gql`
  query GetUserOps($address: String!, $target: String!) {
    userOps(where: { sender: $address, target: $target, success: true }) {
      id
      sender
      userOpHash
      callData
      target
      transactionHash
    }
  }
`;

export const useFetchExecutedUserOperations = (address: string, target: string) => {
  console.log("address: ", address);
  console.log("target: ", target);
  const { data: walletClient } = useWalletClient();
  console.log("walletClient: ", walletClient);

  const { data: uniswapRouter02 } = useArbitaryContract({
    contractName: "UNISWAP_ROUTER02",
    contractAddress: "",
    abi: UniswapV2Router02ABI,
    walletClient,
  });
  const { data: simpleAccount } = useArbitaryContract({
    contractName: "SIMPLE_ACCOUNT",
    contractAddress: "",
    abi: SimpleAccountABI,
    walletClient,
  });

  return useQuery(
    ["getUserOps", address, target],
    async () => {
      const executedUserOperations: any[] = [];
      try {
        const response: { userOps: [] } = await request(GRAPHQL_ENDPOINT, GET_USER_OPS, {
          address,
          target: target !== undefined ? target : null,
        });
        console.log("response: ", response);
        response.userOps.map((userOp: any) => {
          console.log("userOp:212 ", userOp);
          console.log("userOp.userOp.callData21214232: ", userOp.callData);
          console.log("simpleAccount?.abi as unknown as any: ", simpleAccount?.abi as unknown as any);
          const executeData = decodeFunctionData({
            abi: simpleAccount?.abi as unknown as any,
            data: userOp.callData,
          });

          if (executeData && executeData.args.length > 1) {
            const uniswapSwapData = executeData.args[2];
            console.log("uniswapSwapData: ", uniswapSwapData);

            const uniswapSwapDecodedData = decodeFunctionData({
              abi: uniswapRouter02?.abi as unknown as any,
              data: uniswapSwapData,
            });

            console.log("uniswapSwapDecodedData1231231232132: ", uniswapSwapDecodedData);

            const newUserOperation = {
              ...userOp,
              swapParams: uniswapSwapDecodedData,
            };

            executedUserOperations.push(newUserOperation);
          }
        });
      } catch (error) {
        console.log("error: ", error);
      }
      return executedUserOperations;
    },
    {
      refetchOnWindowFocus: true, // Refetch data when the window regains focus
      refetchInterval: 5000, // Refetch data every 5000 milliseconds (adjust as needed)
    },
  );
};

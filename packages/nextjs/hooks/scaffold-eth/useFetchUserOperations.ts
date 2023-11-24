import { useEffect, useState } from "react";
import { useScaffoldContract } from "./useScaffoldContract";
import axios from "axios";
import { decodeFunctionData } from "viem";
import { useWalletClient } from "wagmi";

export const useFetchUserOperations = (userAddress: string) => {
  const [userOperations, setUserOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const bundlerUrl: string = process.env.NEXT_PUBLIC_BUNDLER_URL ?? "http://0.0.0.0:14337/80001";

  const { data: walletClient } = useWalletClient();
  const { data: simpleAccount } = useScaffoldContract({
    contractName: "SIMPLE_ACCOUNT",
    walletClient,
  });
  const { data: uniswapRouter02 } = useScaffoldContract({
    contractName: "UNISWAP_ROUTER02",
    walletClient,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (userAddress) {
          const resp = await axios.post(bundlerUrl, {
            method: "eth_getUserOperations",
            params: [userAddress],
            id: 1,
            jsonrpc: "2.0",
          });
          console.log("resp.status: ", resp.status);
          if (resp.status === 200) {
            const data = resp.data.result;
            console.log("data: ", data);

            const newUserOperationsList: any[] = [];

            data.forEach((userOp: any) => {
              console.log("userOp: ", userOp);
              console.log("userOp.userOp.callData: ", userOp.userOp.callData);
              const executeData = decodeFunctionData({
                abi: simpleAccount?.abi as unknown as any,
                data: userOp.userOp.callData,
              });

              if (executeData && executeData.args.length > 1) {
                const uniswapSwapData = executeData.args[2];
                console.log("uniswapSwapData: ", uniswapSwapData);

                const uniswapSwapDecodedData = decodeFunctionData({
                  abi: uniswapRouter02?.abi as unknown as any,
                  data: uniswapSwapData,
                });

                console.log("uniswapSwapDecodedData: ", uniswapSwapDecodedData);

                const newUserOperation = {
                  ...userOp,
                  swapParams: uniswapSwapDecodedData,
                };

                newUserOperationsList.push(newUserOperation);
              }
            });

            setUserOperations(newUserOperationsList);
          }
        }
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };

    fetchData();
  }, [userAddress]);

  return {
    userOperations,
    loading,
  };
};

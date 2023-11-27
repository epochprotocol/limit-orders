import axios from "axios";
import { useEffect, useState } from "react";
import { decodeFunctionData } from "viem";
import { useWalletClient } from "wagmi";
import { useScaffoldContract } from "./useScaffoldContract";

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
          // const resp = {
          //   "status": 200,
          //   "data": {
          //     "jsonrpc": "2.0",
          //     "id": 1,
          //     "result": [
          //       {
          //         "chainId": "0x13881",
          //         "userOp": {
          //           "sender": "0x29909c250FCA0b32D621BA9c973A26252e353a87",
          //           "nonce": "0x0",
          //           "initCode": "0x4a4fc0bf39d191b5fca7d4868c9f742b342a39c15fbfb9cf0000000000000000000000007b6d3539732894123a5c5db3dc67206c40cd70a90000000000000000000000000000000000000000000000000000000000000000",
          //           "callData": "0xb61d27f6000000000000000000000000b8133b373b0122fce295b9bc436d24216562c05300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000010438ed17390000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000007ce66c50e284000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000007b6d3539732894123a5c5db3dc67206c40cd70a90000000000000000000000000000000000000000000000000000018c132043a40000000000000000000000000000000000000000000000000000000000000002000000000000000000000000135c30ba05c8ff1dde4ae69cb4ee3631855f7e5e0000000000000000000000004b1ee0803eaf7351b4a7ae4d542e66fe4a04fe7a00000000000000000000000000000000000000000000000000000000",
          //           "callGasLimit": "0x16e4a0",
          //           "verificationGasLimit": "0x5fa1f",
          //           "maxFeePerGas": "0x59682f20",
          //           "maxPriorityFeePerGas": "0x59682f00",
          //           "paymasterAndData": "0x",
          //           "preVerificationGas": "0xb818",
          //           "signature": "0x8e4eadd573e0bf6c3d5656684493ea403ab1aab1bba215c70b81e00b07e45455447c4ce04099be73d308b6e5405ac7f9e4c4733e17d465a52edd52f0a1815f961b",
          //           "advancedUserOperation": {
          //             "triggerEvent": {
          //               "contractAddress": "0xBfa045514a4cf0E135eD5F870515F1E087AE82e3",
          //               "eventSignature": "event Sync(uint112 reserve0, uint112 reserve1);",
          //               "evaluationStatement": ":reserve1: / :reserve0: >= 9"
          //             }
          //           }
          //         },
          //         "entryPoint": "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
          //         "prefund": "0x0",
          //         "userOpHash": "0xa93a3d4141991b291aad56a59b50594855a910173089d88e0896edd13746ed88",
          //         "lastUpdatedTime": "0x18c12824e1e"
          //       }
          //     ]
          //   }
          // };
          // const resp = await axios.get("https://api.npoint.io/d03968a17be91df74c6d");

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

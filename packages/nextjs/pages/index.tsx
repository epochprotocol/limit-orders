import { useEffect } from "react";
import { HttpRpcClient, SimpleAccountAPI } from "@epoch-protocol/sdk";
import type { NextPage } from "next";
import { useWalletClient } from "wagmi";
import { MetaHeader } from "~~/components/MetaHeader";
import Swap from "~~/components/swap";
import { useEthersProvider, useEthersSigner } from "~~/utils/scaffold-eth/common";

const Home: NextPage = () => {
  const ENTRY_POINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  const { data: walletClient } = useWalletClient();

  const provider = useEthersProvider();
  console.log("provider: ", provider);
  const signer = useEthersSigner();
  console.log("signer: ", signer);

  const bundlerUrl: string = process.env.NEXT_PUBLIC_BUNDLER_URL ?? "http://localhost:3000";

  useEffect(() => {
    (async () => {
      if (signer && provider) {
        const network = await provider.getNetwork();
        const bundler = new HttpRpcClient(bundlerUrl, ENTRY_POINT, parseInt(network.chainId.toString()));

        const walletAPI = new SimpleAccountAPI({
          provider,
          entryPointAddress: ENTRY_POINT,
          owner: signer,
          factoryAddress: "0x4A4fC0bF39D191b5fcA7d4868C9F742B342a39c1",
        });
        const op = await walletAPI.createSignedUserOp({
          target: "0xe1afC1092c40d32F72Ad065C93f6D27843458B95",
          data: "0x",
        });
        console.log("op: ", op);

        const userOpHash = await bundler.sendUserOpToBundler(op);
        const txid = await walletAPI.getUserOpReceipt(userOpHash);
        console.log("reqId", userOpHash, "txid=", txid);
      }
    })();
  }, [provider, signer, walletClient, bundlerUrl]);

  return (
    <>
      <MetaHeader />
      <div className="App">
        {/* <Header
				connect={connect}
				isConnected={isConnected}
				address={address}
			/> */}
        <div className="mainWindow">
          <Swap />
        </div>
      </div>
      {/* <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">Scaffold-ETH 2</span>
          </h1>
          <p className="text-center text-lg">
            Get started by editing{" "}
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              packages/nextjs/pages/index.tsx
            </code>
          </p>
          <p className="text-center text-lg">
            Edit your smart contract{" "}
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              YourContract.sol
            </code>{" "}
            in{" "}
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              packages/hardhat/contracts
            </code>
          </p>
        </div>

        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <BugAntIcon className="h-8 w-8 fill-secondary" />
              <p>
                Tinker with your smart contract using the{" "}
                <Link href="/debug" passHref className="link">
                  Debug Contract
                </Link>{" "}
                tab.
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <MagnifyingGlassIcon className="h-8 w-8 fill-secondary" />
              <p>
                Explore your local transactions with the{" "}
                <Link href="/blockexplorer" passHref className="link">
                  Block Explorer
                </Link>{" "}
                tab.
              </p>
            </div>
          </div>
        </div>
      </div> */}
    </>
  );
};

export default Home;

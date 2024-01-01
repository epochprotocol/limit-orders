import { useEffect, useState } from "react";
import { HttpRpcClient, SafeAccountAPI, SimpleAccountAPI } from "@epoch-protocol/sdk";
// import { safeDefaultConfig } from "@epoch-protocol/sdk/dist/src/SafeDefaultConfig";
import { useEthersProvider, useEthersSigner } from "~~/utils/scaffold-eth/common";

export const useBundler = () => {
  const ENTRY_POINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  const FACTORY_ADDRESS = "0x4A4fC0bF39D191b5fcA7d4868C9F742B342a39c1";
  const bundlerUrl: string = process.env.NEXT_PUBLIC_BUNDLER_URL ?? "http://localhost:14337/80001";

  const [walletAPI, setWalletAPI] = useState<SafeAccountAPI | SimpleAccountAPI | null>(null);
  const [bundler, setBundler] = useState<HttpRpcClient | null>(null);

  const provider = useEthersProvider();
  const signer = useEthersSigner();

  useEffect(() => {
    (async () => {
      if (signer && provider) {
        const network = await provider.getNetwork();

        const walletAPIInstance = new SimpleAccountAPI({
          provider,
          entryPointAddress: ENTRY_POINT,
          owner: signer,
          factoryAddress: FACTORY_ADDRESS,
        });

        // const walletAPIInstance = new SafeAccountAPI({
        //   provider,
        //   entryPointAddress: ENTRY_POINT,
        //   owner: signer,
        //   safeConfig: safeDefaultConfig[network.chainId],
        //   salt: safeDefaultConfig[network.chainId].salt,
        // });
        setWalletAPI(walletAPIInstance);

        const bundlerInstance = new HttpRpcClient(bundlerUrl, ENTRY_POINT, parseInt(network.chainId.toString()));
        setBundler(bundlerInstance);
      }
    })();
  }, [signer, provider]);

  return { walletAPI, bundler };
};

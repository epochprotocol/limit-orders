import { useEffect, useState } from "react";
import { useBundler } from "./useBundler";

export const useUserSCWallet = () => {
  const { walletAPI } = useBundler();

  const [userSCWalletAddress, setUserSCWalletAddress] = useState<any>("");

  useEffect(() => {
    (async () => {
      if (walletAPI) {
        console.log("walletAPIInstance.accountAddress: ", await walletAPI.getAccountAddress());
        setUserSCWalletAddress(await walletAPI.getAccountAddress());
      }
    })();
  }, [walletAPI]);

  return userSCWalletAddress;
};

import { useEffect, useState } from "react";
import { useBundler } from "./useBundler";

export const useIsWalletDeployed = () => {
  const [isUserWalletNotDeployed, setIsUserWalletNotDeployed] = useState<boolean>(false);

  const { walletAPI } = useBundler();

  useEffect(() => {
    (async () => {
      if (walletAPI) {
        const isNotDeployed = await walletAPI.checkAccountPhantom();
        console.log("isNotDeployed: ", isNotDeployed);
        if (isNotDeployed) {
          setIsUserWalletNotDeployed(true);
        }
      }
    })();
  }, [walletAPI]);

  return isUserWalletNotDeployed;
};

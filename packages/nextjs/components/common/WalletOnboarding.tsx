import { useEffect, useState } from "react";
import { Address } from "../scaffold-eth/Address";
import { Divider, Modal } from "antd";
import { LoaderIcon } from "react-hot-toast";
import QRCode from "react-qr-code";
import { useAccount, usePublicClient } from "wagmi";
import { useBundler } from "~~/hooks/useBundler";
import { useIsWalletDeployed } from "~~/hooks/useIsWalletDeployed";
import { useUserSCWallet } from "~~/hooks/useUserSCWallet";

export const WalletOnboarding = () => {
  const [walletSetupStep1, setWalletSetupStep1] = useState(true);
  const [walletSetupStep2, setWalletSetupStep2] = useState(false);
  const [walletSetupStep3, setWalletSetupStep3] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [userSCWalletBalance, setUserSCWalletBalance] = useState<bigint>(0n);
  const [isUserSCWalletNotDeployed, setIsUserSCWalletNotDeployed] = useState<boolean>(false);

  const publicClient = usePublicClient();
  const { walletAPI, bundler } = useBundler();
  const userSCWalletAddress = useUserSCWallet();
  const isUserWalletNotDeployed = useIsWalletDeployed();
  const account = useAccount();

  useEffect(() => {
    setIsUserSCWalletNotDeployed(isUserWalletNotDeployed);
  }, [isUserWalletNotDeployed]);

  async function walletSetupNextStep() {
    if (walletAPI && bundler && account.address) {
      try {
        if (walletSetupStep1) {
          if (!(userSCWalletBalance === 0n)) {
            setWalletSetupStep1(false);
            setWalletSetupStep2(true);
          }
        } else if (walletSetupStep2) {
          setIsDeploying(true);
          const op = await walletAPI.createSignedUserOp({
            target: account.address,
            data: "0x",
            value: 0n,
          });
          console.log("opdeployWallet: ", op);

          const deployWalletUserOp = await bundler.sendUserOpToBundler(op);
          console.log("deployWalletUserOp: ", deployWalletUserOp);
          setIsDeploying(false);

          if (deployWalletUserOp) {
            setWalletSetupStep2(false);
            setWalletSetupStep3(true);
          }
        }
      } catch (error) {
        console.log("error: ", error);
      }
    }
  }

  async function walletSetupCloseModal() {
    // onClose();
    setWalletSetupStep1(true);
    setWalletSetupStep2(false);
    setWalletSetupStep3(false);
  }

  useEffect(() => {
    const interval = setInterval(async () => {
      if (userSCWalletAddress && userSCWalletAddress !== "") {
        try {
          const balance = await publicClient.getBalance({ address: userSCWalletAddress });
          setUserSCWalletBalance(balance);
        } catch (error) {
          console.log("error: ", error);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [userSCWalletAddress, publicClient]);

  return (
    <Modal
      open={isUserSCWalletNotDeployed}
      footer={null}
      onCancel={() => {
        setIsUserSCWalletNotDeployed(false);
      }}
      title="Manage Your Wallet"
    >
      <div className={`${isUserWalletNotDeployed ? "" : "hidden"}`}>
        <div className="">
          <div className="" onClick={walletSetupCloseModal}></div>
          <Divider className="bg-white h-px my-4" />
          <div className="pt-0 p-8 rounded shadow-lg w-full max-w-lg">
            {walletSetupStep1 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Step 1: Send Gas to Your Wallet (Skip If already sent)</h2>
                <div className="justify-center ">
                  <div className="p-2 flex items-center justify-center ">
                    <Address address={userSCWalletAddress} />
                  </div>

                  <div className="flex items-center justify-center">
                    <QRCode value={userSCWalletAddress} className="mb-4 bg-black" />
                  </div>
                </div>
                <button
                  disabled={userSCWalletBalance === 0n ? true : false}
                  className={
                    userSCWalletBalance === 0n
                      ? "bg-blue-500 text-white px-4 py-2 rounded opacity-50"
                      : "bg-blue-500 text-white px-4 py-2 rounded"
                  }
                  onClick={walletSetupNextStep}
                >
                  {userSCWalletBalance === 0n ? "Wallet Balance is 0" : "Next"}
                </button>
              </div>
            )}
            {walletSetupStep2 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Step 2: Deploy Your Wallet</h2>
                <button
                  disabled={isDeploying}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                  onClick={walletSetupNextStep}
                >
                  {isDeploying ? (
                    <div className="flex justify-center items-center">
                      <LoaderIcon className="p-2 w-full align-center"></LoaderIcon>{" "}
                    </div>
                  ) : (
                    "Deploy Wallet"
                  )}
                </button>
              </div>
            )}
            {walletSetupStep3 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Step 3: Send Assets to Your Wallet</h2>

                <div className="justify-center ">
                  <div className="p-2 flex items-center justify-center ">
                    <Address address={userSCWalletAddress} />
                  </div>

                  <div className="flex items-center justify-center">
                    <QRCode value={userSCWalletAddress} className="mb-4 bg-black" />
                  </div>
                </div>

                <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={walletSetupCloseModal}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

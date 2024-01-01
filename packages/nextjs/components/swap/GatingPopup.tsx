import { useEffect, useState } from "react";
import { LinkOutlined } from "@ant-design/icons";
import { Divider, Modal } from "antd";
import { useAccount } from "wagmi";

type AddressData = {
  addresses: string[];
};
/*
 * Token Gating popup
 */
// type GatingPopupProps = { address: string | undefined };

const containsAddress = (data: AddressData, targetAddress: string): boolean => {
  const lowercasedTarget = targetAddress.toLowerCase();

  // Convert all addresses to lowercase for a case-insensitive check
  const lowercaseAddresses = data.addresses.map(address => address.toLowerCase());

  return lowercaseAddresses.includes(lowercasedTarget);
};

export const GatingPopup = () => {
  const { address } = useAccount();
  const [whitelist, setWhitelist] = useState<AddressData>();
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Make the API call
        const response = await fetch("https://raw.githubusercontent.com/epochprotocol/whitelist/main/whitelist.json");
        const result = await response.json();

        // Update state with the raw data
        setWhitelist(result);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    // Only fetch data if it hasn't been loaded yet
    if (!whitelist) {
      fetchData();
    }
  }, [whitelist]);
  useEffect(() => {
    if (address === undefined) {
      console.log("address is undefined??", address);
      setShowModal(false);
    } else {
      if (whitelist) {
        console.log("checking if it contains address or not", address, whitelist);
        setShowModal(!containsAddress(whitelist, address));
      }
    }
  }, [address, whitelist]);

  return (
    <Modal
      open={showModal}
      footer={null}
      title="This wallet is not whitelisted"
      closable={false}
      className="w-full max-w-lg"
      zIndex={1001}
    >
      <div className={`${showModal ? "block" : "hidden"}`}>
        <div className="px-8 pb-8 rounded shadow-lg">
          <Divider className="bg-white h-px mb-6" />
          <p className="mb-4">
            The product is only available to selected whitelisted users. Join our Discord community and ask to get into
            the whitelist to use this product.
          </p>
          <div className="flex items-center space-x-4">
            <a
              href="https://discord.gg/Pd4yZmqYjb"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-500 hover:underline"
            >
              <LinkOutlined className="text-xl" rev={undefined} />
              <span className="ml-2">Join Discord</span>
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
};

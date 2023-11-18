import React, { useEffect, useState } from "react";
import tokenList from "../../components/assets/tokenList.json";
import UniswapV2Router02ABI from "../../contracts/UniswapV2Router02ABI";
import { DownOutlined, SettingOutlined } from "@ant-design/icons";
import { Modal, Popover, Radio, message } from "antd";
import { formatEther, parseEther } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { ArrowSmallDownIcon } from "@heroicons/react/24/outline";

function Swap() {
  const styles = {
    assetStyle:
      "absolute h-8 bg-[#3a4157] flex justify-start items-center font-bold text-base pr-2 top-[25px] right-[20px] rounded-full gap-[5px] hover:cursor-pointer",
    modalContent: "mt-5 flex flex-col border-t-1 border-solid border-[#363e54] gap-[10px]",
    inputTile: "relative bg-[#212429] p-4 py-6 rounded-xl mb-2 border-[2px] border-transparent hover:border-zinc-600",
    inputField: "w-full outline-none h-8 px-2 appearance-none text-3xl bg-transparent",
    inputFlex: "flex items-center rounded-xl",
  };

  const [messageApi, contextHolder] = message.useMessage();
  const [slippage, setSlippage] = useState(2.5);
  const [tokenOneAmount, setTokenOneAmount] = useState<number>(0);
  const [tokenTwoAmount, setTokenTwoAmount] = useState<number>(0);
  const [tokenOne, setTokenOne] = useState(tokenList[0]);
  const [tokenTwo, setTokenTwo] = useState(tokenList[1]);
  const [isOpen, setIsOpen] = useState(false);
  const [changeToken, setChangeToken] = useState(1);
  const [prices, setPrices] = useState<number>(0);
  const [txDetails, setTxDetails] = useState({
    to: null,
    data: null,
    value: null,
  });
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [needToIncreaseAllowance, setNeedToIncreaseAllowance] = useState<boolean>(false);

  // const { data, sendTransaction } = useSendTransaction({
  // 	request: {
  // 		from: address,
  // 		to: String(txDetails.to),
  // 		data: String(txDetails.data),
  // 		value: String(txDetails.value),
  // 	},
  // });

  // const { isLoading, isSuccess } = useWaitForTransaction({
  // 	hash: data?.hash,
  // });

  function handleSlippageChange(e: any) {
    setSlippage(e.target.value);
  }

  // function changeAmount(e: any) {
  // 	console.log("current value:", e.target.value);
  // 	setTokenOneAmount(e.target.value);
  // 	if (e.target.value && prices) {
  // 		setTokenTwoAmount(Number(prices.toFixed(5)));
  // 	} else {
  // 		setTokenTwoAmount(0);
  // 	}
  // }

  function switchTokens() {
    setPrices(0);
    setTokenOneAmount(0);
    setTokenTwoAmount(0);
    const one = tokenOne;
    const two = tokenTwo;
    setTokenOne(two);
    setTokenTwo(one);
  }

  function openModal(asset: React.SetStateAction<number>) {
    setChangeToken(asset);
    setIsOpen(true);
  }

  function modifyToken(i: number) {
    setPrices(0);
    setTokenOneAmount(0);
    setTokenTwoAmount(0);
    if (changeToken === 1) {
      setTokenOne(tokenList[i]);
    } else {
      setTokenTwo(tokenList[i]);
    }
    setIsOpen(false);
  }

  async function fetchPrices(one: string, two: string) {
    console.log("We are here");
    console.log(parseEther(tokenOneAmount.toString()));

    const data = await publicClient
      .readContract({
        address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        functionName: "quote",
        abi: UniswapV2Router02ABI,
        args: [parseEther(tokenOneAmount.toString()).toString(), one, two],
      })
      .then((data: any) => {
        const price = Number(formatEther(BigInt(data as string)));
        console.log("price have arrived", price);
        setPrices(price);
      });
    // const res = await axios.get(`http://localhost:3001/tokenPrice`, {
    // 	params: { addressOne: one, addressTwo: two },
    // });
  }

  useEffect(() => {
    if (tokenOneAmount > 0) fetchPrices(tokenOne.address, tokenTwo.address);
  }, [tokenOne, tokenTwo, tokenOneAmount]);

  useEffect(() => {
    if (txDetails.to && address) {
      // sendTransaction();
    }
  }, [txDetails, address]);

  // async function fetchDexSwap() {
  // 	const allowance = await axios.get(
  // 		`https://api.1inch.io/v5.0/1/approve/allowance?tokenAddress=${tokenOne.address}&walletAddress=${address}`
  // 	);

  // 	if (allowance.data.allowance === "0") {
  // 		const approve = await axios.get(
  // 			`https://api.1inch.io/v5.0/1/approve/transaction?tokenAddress=${tokenOne.address}`
  // 		);

  // 		setTxDetails(approve.data);
  // 		console.log("not approved");
  // 		return;
  // 	}

  // 	const tx = await axios.get(
  // 		`https://api.1inch.io/v5.0/1/swap?fromTokenAddress=${
  // 			tokenOne.address
  // 		}&toTokenAddress=${tokenTwo.address}&amount=${tokenOneAmount.padEnd(
  // 			tokenOne.decimals + tokenOneAmount.length,
  // 			"0"
  // 		)}&fromAddress=${address}&slippage=${slippage}`
  // 	);

  // 	let decimals = Number(`1E${tokenTwo.decimals}`);
  // 	setTokenTwoAmount(
  // 		(Number(tx.data.toTokenAmount) / decimals).toFixed(2)
  // 	);

  // 	setTxDetails(tx.data.tx);
  // }

  // useEffect(() => {
  // 	fetchPrices(tokenList[0].address, tokenList[1].address);
  // }, []);

  // useEffect(() => {
  // 	messageApi.destroy();

  // 	if (isLoading) {
  // 		messageApi.open({
  // 			type: "loading",
  // 			content: "Transaction is Pending...",
  // 			duration: 0,
  // 		});
  // 	}
  // }, [isLoading]);

  // useEffect(() => {
  // 	messageApi.destroy();
  // 	if (isSuccess) {
  // 		messageApi.open({
  // 			type: "success",
  // 			content: "Transaction Successful",
  // 			duration: 1.5,
  // 		});
  // 	} else if (txDetails.to) {
  // 		messageApi.open({
  // 			type: "error",
  // 			content: "Transaction Failed",
  // 			duration: 1.5,
  // 		});
  // 	}
  // }, [isSuccess]);

  const settings = (
    <>
      <div>Slippage Tolerance</div>
      <div>
        <Radio.Group value={slippage} onChange={handleSlippageChange}>
          <Radio.Button value={0.5}>0.5%</Radio.Button>
          <Radio.Button value={2.5}>2.5%</Radio.Button>
          <Radio.Button value={5}>5.0%</Radio.Button>
        </Radio.Group>
      </div>
    </>
  );

  return (
    <>
      {contextHolder}
      <Modal open={isOpen} footer={null} onCancel={() => setIsOpen(false)} title="Select a token">
        <div className={styles.modalContent}>
          {tokenList?.map((e, i) => {
            return (
              <div
                className="flex justify-start items-center pl-5 pt-2 pb-2 hover:cursor-pointer hover:bg-gray-800"
                key={i}
                onClick={() => modifyToken(i)}
              >
                <img src={e.img} alt={e.ticker} className="h-10 w-10" />
                <div className="tokenChoiceNames">
                  <div className="ml-2 text-base font-medium">{e.name}</div>
                  <div className="ml-2 text-xs font-light text-gray-500">{e.ticker}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      <div className="bg-zinc-900 pt-2 pb-4 px-6 rounded-xl">
        <div className="flex items-center justify-between py-3 px-1">
          <div>Swap</div>
          <Popover content={settings} title="Settings" trigger="click" placement="bottomRight">
            <SettingOutlined className="h-6" />
          </Popover>
        </div>
        <div className={styles.inputTile}>
          <div className={styles.inputFlex}>
            <input
              placeholder="0"
              className={styles.inputField}
              value={tokenOneAmount?.toString()}
              onChange={e => {
                setTokenOneAmount(Number(e.target.value));
              }}
              // disabled={!prices}
            />

            <div className={styles.assetStyle} onClick={() => openModal(1)}>
              <img src={tokenOne.img} alt="assetOneLogo" className="h-5 ml-2" />
              {tokenOne.ticker}
              <DownOutlined rev={undefined} />
            </div>
          </div>

          <ArrowSmallDownIcon
            className="absolute left-1/2 -translate-x-1/2 -bottom-6 z-10 h-10 p-1 bg-[#212429] border-4 border-zinc-900 text-zinc-300 rounded-xl cursor-pointer hover:scale-110"
            onClick={switchTokens}
          />
        </div>

        <div className={styles.inputTile}>
          <div className={styles.inputFlex}>
            <input
              placeholder="0"
              className={styles.inputField}
              value={tokenTwoAmount?.toString()}
              onChange={e => {
                setTokenTwoAmount(Number(e.target.value));
              }}
              // disabled={!prices}
            />

            <div className={styles.assetStyle} onClick={() => openModal(2)}>
              <img src={tokenTwo.img} alt="assetTwoLogo" className="h-5 ml-2" />
              {tokenTwo.ticker}
              <DownOutlined rev={undefined} />
            </div>
          </div>
        </div>
        <div className="text-gray-400 text-xs">Current Exchange: {prices.toFixed(5)}</div>

        <button
          className={getSwapBtnClassName()}
          onClick={() => {
            //fetchDexSwap()
          }}
        >
          {address == null ? "Connect Wallet" : "Swap"}
        </button>
      </div>
    </>
  );

  function getSwapBtnClassName() {
    let className = "p-4 w-full my-2 rounded-xl";
    className +=
      address == null || tokenOneAmount === 0 ? " text-zinc-400 bg-zinc-800 pointer-events-none" : " bg-blue-700";
    className += needToIncreaseAllowance ? " bg-yellow-600" : "";
    return className;
  }
}

export default Swap;

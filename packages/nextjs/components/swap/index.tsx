import React, { useEffect, useState } from "react";
import tokenList from "../../components/assets/tokenList.json";
import UniswapV2Router02ABI from "../../contracts/UniswapV2Router02ABI";
import { ArrowDownOutlined, DownOutlined, SettingOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Popover, Radio, message } from "antd";
import { formatEther, parseEther } from "viem";
import { useAccount, usePublicClient } from "wagmi";

function Swap() {
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
        <div className="modalContent">
          {tokenList?.map((e, i) => {
            return (
              <div className="tokenChoice" key={i} onClick={() => modifyToken(i)}>
                <img src={e.img} alt={e.ticker} className="tokenLogo" />
                <div className="tokenChoiceNames">
                  <div className="tokenName">{e.name}</div>
                  <div className="tokenTicker">{e.ticker}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
      <div className="tradeBox">
        <div className="tradeBoxHeader">
          <h4>Swap</h4>
          <Popover content={settings} title="Settings" trigger="click" placement="bottomRight">
            <SettingOutlined className="cog" rev={undefined} />
          </Popover>
        </div>
        <div className="inputs">
          <Input
            placeholder="0"
            value={tokenOneAmount?.toString()}
            onChange={e => {
              setTokenOneAmount(Number(e.target.value));
            }}
            // disabled={!prices}
          />
          <Input
            placeholder="0"
            value={tokenTwoAmount?.toString()}
            onChange={e => setTokenTwoAmount(Number(e.target.value))}
          />
          <div>Current Exchange: {prices}</div>

          <div className="switchButton" onClick={switchTokens}>
            <ArrowDownOutlined className="switchArrow" rev={undefined} />
          </div>
          <div className="assetOne" onClick={() => openModal(1)}>
            <img src={tokenOne.img} alt="assetOneLogo" className="assetLogo" />
            {tokenOne.ticker}
            <DownOutlined rev={undefined} />
          </div>
          <div className="assetTwo" onClick={() => openModal(2)}>
            <img src={tokenTwo.img} alt="assetOneLogo" className="assetLogo" />
            {tokenTwo.ticker}
            <DownOutlined rev={undefined} />
          </div>
        </div>
        <Button
          className="swapButton"
          disabled={!tokenOneAmount || !address}
          //onClick={fetchDexSwap}
        >
          Swap
        </Button>
      </div>
    </>
  );
}

export default Swap;

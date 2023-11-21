import React, { useEffect, useState } from "react";
import tokenList from "../../components/assets/tokenList.json";
import UniswapV2Router02ABI from "../../contracts/UniswapV2Router02ABI";
import { DownOutlined, SettingOutlined } from "@ant-design/icons";
import { HttpRpcClient, SimpleAccountAPI } from "@epoch-protocol/sdk";
import { AdvancedUserOperationStruct } from "@epoch-protocol/sdk/dist/src/AdvancedUserOp";
import { Modal, Popover, Radio, message } from "antd";
import { BigNumber } from "ethers";
import { encodeFunctionData, formatEther, parseAbi, parseEther } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ArrowSmallDownIcon } from "@heroicons/react/24/outline";
import externalContracts from "~~/contracts/externalContracts";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
import { useEthersProvider, useEthersSigner } from "~~/utils/scaffold-eth/common";

function Swap() {
  const styles = {
    assetStyle:
      "absolute h-8 bg-[#3a4157] flex justify-start items-center font-bold text-base pr-2 top-[25px] right-[20px] rounded-full gap-[5px] hover:cursor-pointer",
    modalContent: "mt-5 flex flex-col border-t-1 border-solid border-[#363e54] gap-[10px]",
    inputTile: "relative bg-[#212429] p-4 py-6 rounded-xl mb-2 border-[2px] border-transparent hover:border-zinc-600",
    inputField: "w-full outline-none h-8 px-2 appearance-none text-3xl bg-transparent",
    inputFlex: "flex items-center rounded-xl",
  };

  const ENTRY_POINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  const FACTORY_ADDRESS = "0x4A4fC0bF39D191b5fcA7d4868C9F742B342a39c1";

  const [messageApi, contextHolder] = message.useMessage();
  const [slippage, setSlippage] = useState(2.5);
  const [tokenOneAmount, setTokenOneAmount] = useState<string>("");
  const [tokenTwoAmount, setTokenTwoAmount] = useState<string>("");
  const [tokenTwoLimitPrice, setTokenTwoLimitPrice] = useState<string>("");
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

  const provider = useEthersProvider();
  console.log("provider: ", provider);
  const signer = useEthersSigner();
  console.log("signer: ", signer);

  const { data: walletClient } = useWalletClient();

  const { data: uniswapRouter02 } = useScaffoldContract({
    contractName: "UNISWAP_ROUTER02",
    walletClient,
  });

  const { data: token1 } = useScaffoldContract({
    contractName: "TOKEN1",
    walletClient,
  });

  const { data: token2 } = useScaffoldContract({
    contractName: "TOKEN2",
    walletClient,
  });

  const bundlerUrl: string = process.env.NEXT_PUBLIC_BUNDLER_URL ?? "http://0.0.0.0:14337/80001";

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
    setTokenOneAmount("0");
    setTokenTwoAmount("0");
    const one = tokenOne;
    const two = tokenTwo;
    setTokenOne(two);
    setTokenTwo(one);

    fetchPrices(two.address, one.address);
  }

  function openModal(asset: React.SetStateAction<number>) {
    setChangeToken(asset);
    setIsOpen(true);
  }

  function modifyToken(i: number) {
    setPrices(0);
    setTokenOneAmount("0");
    setTokenTwoAmount("0");
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
    console.log("publicClient: ", publicClient);

    if (uniswapRouter02 && uniswapRouter02.address) {
      const data = await uniswapRouter02.read.getAmountsOut([BigInt(parseEther("1").toString()), [one, two]]);

      if (data) {
        console.log("data: ", data);

        const price = Number(formatEther(data[1]));
        console.log("price: ", price);
        console.log("price have arrived", price);
        setPrices(price);
        setTokenTwoAmount((Number(tokenOneAmount) * price).toString());
        setTokenTwoLimitPrice(price.toString());
      }

      // const res = await axios.get(`http://localhost:3001/tokenPrice`, {
      // 	params: { addressOne: one, addressTwo: two },
      // });
    }
  }

  const executeSwap = async () => {
    try {
      if (signer && provider && address && token1 && token2 && uniswapRouter02) {
        const network = await provider.getNetwork();

        const walletAPI = new SimpleAccountAPI({
          provider,
          entryPointAddress: ENTRY_POINT,
          owner: signer,
          factoryAddress: FACTORY_ADDRESS,
        });
        const bundler = new HttpRpcClient(bundlerUrl, ENTRY_POINT, parseInt(network.chainId.toString()));

        // const dataToken1Approve = encodeFunctionData({
        //   abi: token1?.abi as unknown as any,
        //   args: [uniswapRouter02?.address, BigInt(tokenOneAmount) * 10n ** 18n],
        //   functionName: "approve",
        // });

        // const opToken1Approve = await walletAPI.createSignedUserOp({
        //   target: token1?.address,
        //   data: dataToken1Approve,
        // });
        // const userOpHashToken1 = await bundler.sendUserOpToBundler(opToken1Approve);
        // console.log("userOpHashToken1: ", userOpHashToken1);

        // const dataToken2Approve = encodeFunctionData({
        //   abi: token2?.abi as unknown as any,
        //   args: [uniswapRouter02?.address, BigInt(tokenOneAmount) * 10n ** 18n],
        //   functionName: "approve",
        // });

        // const opToken2Approve = await walletAPI.createSignedUserOp({
        //   target: token2?.address,
        //   data: dataToken2Approve,
        // });
        // const userOpHashToken2 = await bundler.sendUserOpToBundler(opToken2Approve);
        // console.log("userOpHashToken2: ", userOpHashToken2);

        const data = encodeFunctionData({
          abi: uniswapRouter02?.abi as unknown as any,
          args: [
            parseEther(tokenOneAmount.toString()),
            parseEther(tokenTwoLimitPrice.toString()),
            [tokenOne.address, tokenTwo.address],
            address,
            BigInt(new Date().valueOf() + 3600 * 24 * 120),
          ],
          functionName: "swapExactTokensForTokens",
        });
        console.log("data: ", data);

        const op = await walletAPI.createSignedUserOp({
          target: uniswapRouter02?.address,
          data,
          maxFeePerGas: BigNumber.from("1500000032"),
          maxPriorityFeePerGas: BigNumber.from("1500000000"),
          gasLimit: BigNumber.from("1500320"),
        });
        console.log("op: ", op);

        const advancedOp: AdvancedUserOperationStruct = {
          ...op,
          advancedUserOperation: {
            triggerEvent: {
              contractAddress: uniswapRouter02?.address,
              eventSignature:
                "event Swap(address indexed sender,uint amount0In,uint amount1In,uint amount0Out,uint amount1Out,address indexed to);",
              evaluationStatement: `:amount0In: / :amount1Out: >= ${tokenTwoLimitPrice}`,
            },
          },
        };
        console.log("advancedOp: ", advancedOp);
        console.log("bundlerUrl: ", bundlerUrl);

        const userOpHash = await bundler.sendUserOpToBundler(advancedOp);
        const txid = await walletAPI.getUserOpReceipt(userOpHash);
        console.log("reqId", userOpHash, "txid=", txid);
      }
    } catch (error) {
      console.log("error: ", error);
    }
  };

  useEffect(() => {
    if (tokenOneAmount) fetchPrices(tokenOne.address, tokenTwo.address);
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
                setTokenOneAmount(e.target.value);
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
              defaultValue={tokenTwoAmount}
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

        <div className={styles.inputTile}>
          <div className={styles.inputFlex}>
            <input
              placeholder="0"
              className={styles.inputField}
              value={tokenTwoLimitPrice?.toString()}
              onChange={e => {
                setTokenTwoLimitPrice(e.target.value);
              }}
              // disabled={!prices}
            />
          </div>
        </div>

        <button className={getSwapBtnClassName()} onClick={executeSwap}>
          {address == null ? "Connect Wallet" : "Swap"}
        </button>
      </div>

      <div className="bg-zinc-900 pt-2 pb-4 px-6 rounded-xl" style={{ color: "white", marginLeft: "2rem" }}>
        <div className="flex items-center justify-between py-3 px-1">
          <div>Your Orders</div>
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
                setTokenOneAmount(e.target.value);
              }}
              // disabled={!prices}
            />

            <div className={styles.assetStyle} onClick={() => openModal(1)}>
              <img src={tokenOne.img} alt="assetOneLogo" className="h-5 ml-2" />
              {tokenOne.ticker}
              <DownOutlined rev={undefined} />
            </div>
          </div>
        </div>

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
      address == null || tokenOneAmount === "0" ? " text-zinc-400 bg-zinc-800 pointer-events-none" : " bg-blue-700";
    className += needToIncreaseAllowance ? " bg-yellow-600" : "";
    return className;
  }
}

export default Swap;

import React, { useEffect, useState } from "react";
import tokenList from "../../components/assets/tokenList.json";
import { CloseCircleOutlined, DownOutlined, ReloadOutlined, SettingOutlined } from "@ant-design/icons";
import { HttpRpcClient, SimpleAccountAPI } from "@epoch-protocol/sdk";
import { AdvancedUserOperationStruct } from "@epoch-protocol/sdk/dist/src/AdvancedUserOp";
import { Divider, Modal, Popover, Radio, Select, notification } from "antd";
import { BigNumber } from "ethers";
import { LoaderIcon } from "react-hot-toast";
import { encodeFunctionData, formatEther, formatUnits, parseEther, parseUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ArrowSmallDownIcon } from "@heroicons/react/24/outline";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
import { useFetchUserOperations } from "~~/hooks/scaffold-eth/useFetchUserOperations";
import { useEthersProvider, useEthersSigner } from "~~/utils/scaffold-eth/common";

function Swap() {
  const styles = {
    assetStyle:
      "absolute h-8 bg-[#3a4157] flex justify-start items-center font-bold text-base pr-2 top-[25px] right-[20px] rounded-full gap-[5px] hover:cursor-pointer",
    modalContent: "mt-5 flex flex-col border-t-1 border-solid border-[#363e54] gap-[10px]",
    confirmationModalContent: "p-5 flex flex-col border-t-1 border-solid border-[#363e54] gap-[10px] ",
    inputTile: "relative bg-[#212429] p-4 py-6 rounded-xl mb-2 border-[2px] border-transparent hover:border-zinc-600",
    inputTileSmall:
      "relative bg-[#212429] m-2 p-1 py-2 rounded-xl mb-2 border-[1px] border-outlined hover:border-zinc-600",
    inputField: "w-full outline-none h-8 px-2 appearance-none text-3xl bg-transparent",
    inputFiledSmall: "w-full outline-none h-4 px-2 appearance-none text-lg bg-transparent",
    inputFlex: "flex items-center rounded-xl",
    lableStyle: "text-gray-400 text-xs",
  };

  const ENTRY_POINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  const FACTORY_ADDRESS = "0x4A4fC0bF39D191b5fcA7d4868C9F742B342a39c1";

  const [notificationApi, contextHolder] = notification.useNotification();
  const [slippage, setSlippage] = useState(2.5);
  const [tokenOneAmount, setTokenOneAmount] = useState<string>("");
  const [tokenTwoAmount, setTokenTwoAmount] = useState<string>("");
  const [tokenOneLimitPrice, setTokenOneLimitPrice] = useState<string>("");
  const [tokenTwoLimitAmount, setTokenTwoLimitAmount] = useState<string>("");
  const [tokenOne, setTokenOne] = useState(tokenList[0]);
  const [tokenTwo, setTokenTwo] = useState(tokenList[1]);
  const [isTokenPickerOpen, setIsTokenPickerOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [changeToken, setChangeToken] = useState(1);
  const [swapping, setSwapping] = useState(false);

  const [prices, setPrices] = useState<number>(0);
  const [txDetails, setTxDetails] = useState({
    to: null,
    data: null,
    value: null,
  });
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [needToIncreaseAllowance, setNeedToIncreaseAllowance] = useState<boolean>(false);
  const [walletAPI, setWalletAPI] = useState<SimpleAccountAPI | null>(null);
  const [bundler, setBundler] = useState<HttpRpcClient | null>(null);
  const [userSCWalletAddress, setUserSCWalletAddress] = useState<any>("");
  enum OrderTypes {
    LimitOrder,
    MarketOrder,
    StopMarketOrder,
  }
  enum ExchangeTypes {
    Uniswap,
    SushiSwap,
    QuickSwap,
  }
  const orderTypes: Map<OrderTypes, string> = new Map([
    [OrderTypes.LimitOrder, "Limit Order"],
    [OrderTypes.MarketOrder, "Market Order"],
    [OrderTypes.StopMarketOrder, "Stop-Market Order"],
  ]);
  const exchangeTypes: Map<ExchangeTypes, string> = new Map([
    [ExchangeTypes.Uniswap, "Uniswap"],
    [ExchangeTypes.SushiSwap, "SushiSwap"],
    [ExchangeTypes.QuickSwap, "QuickSwap"],
  ]);
  const [orderType, setOrderType] = useState<OrderTypes>(OrderTypes.LimitOrder!);
  const [exchangeType, setExchangeType] = useState<ExchangeTypes>(ExchangeTypes.Uniswap!);
  // console.log("userSCWalletAddress: ", userSCWalletAddress);

  const provider = useEthersProvider();
  // console.log("provider: ", provider);
  const signer = useEthersSigner();
  // console.log("signer: ", signer);

  const { data: walletClient } = useWalletClient();

  const { data: uniswapRouter02 } = useScaffoldContract({
    contractName: "UNISWAP_ROUTER02",
    walletClient,
  });
  const { data: uniswapFactory } = useScaffoldContract({
    contractName: "UNISWAP_FACTORY",
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
        console.log("walletAPIInstance: ", walletAPIInstance);

        setWalletAPI(walletAPIInstance);

        const bundlerInstance = new HttpRpcClient(bundlerUrl, ENTRY_POINT, parseInt(network.chainId.toString()));
        setBundler(bundlerInstance);

        console.log("walletAPIInstance.accountAddress: ", await walletAPIInstance.getAccountAddress());
        setUserSCWalletAddress(await walletAPIInstance.getAccountAddress());
      }
    })();
  }, [signer, provider]);

  useEffect(() => {
    setTokenTwoLimitAmount((Number(tokenOneLimitPrice) * Number(tokenOneAmount)).toString());
  }, [tokenOneLimitPrice, tokenOneAmount, tokenOne, tokenTwo]);

  const { userOperations, loading: userOperationsLoading } = useFetchUserOperations(userSCWalletAddress);
  // console.log("userOperations: ", userOperations);

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

  async function reload() {
    setTokenOneAmount("0");
    setTokenTwoAmount("0");

    setSlippage(2.5);
    setTokenOneLimitPrice("");
    setTokenTwoLimitAmount("");
    setTokenOne(tokenList[0]);
    setTokenTwo(tokenList[1]);
    setIsTokenPickerOpen(false);
    setIsConfirmationOpen(false);
    setChangeToken(1);
    setPrices(0);
    setTxDetails({
      to: null,
      data: null,
      value: null,
    });
    setNeedToIncreaseAllowance(false);
    setWalletAPI(null);
    setBundler(null);
    setUserSCWalletAddress("");
  }

  async function switchTokens() {
    setPrices(0);
    setTokenOneAmount("0");
    setTokenTwoAmount("0");
    const one = tokenOne;
    const two = tokenTwo;
    setTokenOne(two);
    setTokenTwo(one);

    await fetchPrices(two.address, one.address).then(price => {
      setTokenOneLimitPrice(price.toString());
      setTokenTwoLimitAmount((Number(tokenOneLimitPrice) * Number(tokenOneAmount)).toString());
    });
  }

  function openModal(asset: React.SetStateAction<number>) {
    setChangeToken(asset);
    setIsTokenPickerOpen(true);
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
    setIsTokenPickerOpen(false);
  }

  async function fetchPrices(one: string, two: string): Promise<Number> {
    // console.log(parseEther(tokenOneAmount.toString()));
    // console.log("publicClient: ", publicClient);

    if (uniswapRouter02 && uniswapRouter02.address) {
      const data: any = await uniswapRouter02.read.getAmountsOut([BigInt(parseEther("1").toString()), [one, two]]);

      if (data) {
        // console.log("data: ", data);

        const price = Number(formatEther(data[1] as bigint));
        // console.log("price: ", price);
        // console.log("price have arrived", price);
        setPrices(price);
        setTokenTwoAmount((Number(tokenOneAmount) * price).toString());
        if (tokenOneLimitPrice.length === 0) {
          setTokenOneLimitPrice(price.toString());
          setTokenTwoLimitAmount((Number(tokenOneLimitPrice) * Number(tokenOneAmount)).toString());
        }
        return price;
      }
    }
    return 0;
  }

  const executeSwap = async () => {
    try {
      if (
        signer &&
        provider &&
        address &&
        token1 &&
        token2 &&
        uniswapRouter02 &&
        uniswapFactory &&
        walletAPI &&
        bundler
      ) {
        setSwapping(true);
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

        let data;
        if (orderType === OrderTypes.StopMarketOrder) {
          const amountOut = Number(tokenTwoLimitAmount) - (Number(tokenTwoLimitAmount) * slippage) / 100;
          data = encodeFunctionData({
            abi: uniswapRouter02?.abi as unknown as any,
            args: [
              parseUnits(tokenOneAmount.toString(), tokenOne.decimals),
              parseUnits(amountOut.toString(), tokenTwo.decimals),
              [tokenOne.address, tokenTwo.address],
              address,
              BigInt(new Date().valueOf() + 3600 * 24 * 120),
            ],
            functionName: "swapExactTokensForTokens",
          });
        } else {
          data = encodeFunctionData({
            abi: uniswapRouter02?.abi as unknown as any,
            args: [
              parseUnits(tokenOneAmount.toString(), tokenOne.decimals),
              parseUnits(tokenTwoLimitAmount.toString(), tokenTwo.decimals),
              [tokenOne.address, tokenTwo.address],
              address,
              BigInt(new Date().valueOf() + 3600 * 24 * 120),
            ],
            functionName: "swapExactTokensForTokens",
          });
        }

        console.log("data: ", data);

        const poolData = await uniswapFactory.read.getPair([tokenOne.address, tokenTwo.address]);
        console.log("poolData: ", poolData);

        const unsignedUserOp = await walletAPI.createUnsignedUserOp({
          target: uniswapRouter02?.address,
          data,
          maxFeePerGas: BigNumber.from("1500000032"),
          maxPriorityFeePerGas: BigNumber.from("1500000000"),
          gasLimit: BigNumber.from("1500320"),
          value: 0n,
        });
        console.log("unsignedUserOp: ", unsignedUserOp);
        console.log("uniswapRouter02: ", uniswapRouter02?.address);

        // let newUserOp: any;
        // unsignedUserOp.sender = await unsignedUserOp.sender
        // Object.keys(unsignedUserOp).map(async (key: any) => {
        //   newUserOp[key] = await unsignedUserOp[key];
        // });

        const newUserOp: any = {
          sender: await unsignedUserOp.sender,
          nonce: await unsignedUserOp.nonce,
          initCode: await unsignedUserOp.initCode,
          callData: await unsignedUserOp.callData,
          callGasLimit: await unsignedUserOp.callGasLimit,
          verificationGasLimit: await unsignedUserOp.verificationGasLimit,
          preVerificationGas: await unsignedUserOp.preVerificationGas,
          maxFeePerGas: await unsignedUserOp.maxFeePerGas,
          maxPriorityFeePerGas: await unsignedUserOp.maxPriorityFeePerGas,
          paymasterAndData: await unsignedUserOp.paymasterAndData,
          signature: await unsignedUserOp.signature,
        };

        const key = await bundler.getValidNonceKey(newUserOp);
        console.log("key: ", key);

        const nonce = await walletAPI.getNonce(key);
        console.log("nonce: ", nonce);

        newUserOp.nonce = nonce;

        // const op = await walletAPI.createSignedUserOp({
        //   target: uniswapRouter02?.address,
        //   data,
        //   maxFeePerGas: BigNumber.from("1500000032"),
        //   maxPriorityFeePerGas: BigNumber.from("1500000000"),
        //   gasLimit: BigNumber.from("1500320"),
        //   value: 0n,
        //   // nonce,
        // });

        const signedUserOp = await walletAPI.signUserOp(newUserOp);
        console.log("signedUserOp: ", signedUserOp);

        let advancedOp: AdvancedUserOperationStruct;

        if (orderType === OrderTypes.MarketOrder) {
          advancedOp = {
            ...signedUserOp,
          };
        } else {
          let evaluationStatement;

          if (orderType === OrderTypes.LimitOrder) {
            if (tokenOne.address < tokenTwo.address) {
              evaluationStatement = `:reserve1: / :reserve0: >= ${tokenOneLimitPrice}`;
            } else {
              evaluationStatement = `:reserve0: / :reserve1: >= ${tokenOneLimitPrice}`;
            }
            console.log("evaluationStatement: ", evaluationStatement);
          }
          if (orderType === OrderTypes.StopMarketOrder) {
            if (tokenOne.address < tokenTwo.address) {
              evaluationStatement = `:reserve1: / :reserve0: <= ${tokenOneLimitPrice}`;
            } else {
              evaluationStatement = `:reserve0: / :reserve1: <= ${tokenOneLimitPrice}`;
            }
            console.log("evaluationStatement: ", evaluationStatement);
          }

          advancedOp = {
            ...signedUserOp,
            advancedUserOperation: {
              triggerEvent: {
                contractAddress: poolData as string,
                eventSignature: "event Sync(uint112 reserve0, uint112 reserve1);",
                evaluationStatement,
              },
            },
          };
          console.log("advancedOp: ", advancedOp);
        }

        // console.log("bundlerUrl: ", bundlerUrl);

        const userOpHash = await bundler.sendUserOpToBundler(advancedOp);
        const txid = await walletAPI.getUserOpReceipt(userOpHash);
        console.log("reqId", userOpHash, "txid=", txid);
      }
    } catch (error) {
      console.log("error: ", error);
    }
    setSwapping(false);
    setIsConfirmationOpen(false);
  };

  const deleteOrder = async (userOp: any) => {
    console.log("userOp: ", userOp.userOp.nonce);
  };

  useEffect(() => {
    if (tokenOneAmount) fetchPrices(tokenOne.address, tokenTwo.address);
  }, [tokenOne, tokenTwo, tokenOneAmount]);

  const settings = (
    <>
      <div className="mr-2">Slippage Tolerance :</div>
      <div className="flex-row items-center space-x-2">
        <Radio.Group value={slippage} onChange={handleSlippageChange}>
          <Radio.Button value={0.5}>0.5%</Radio.Button>
          <Radio.Button value={2.5}>2.5%</Radio.Button>
        </Radio.Group>
        <input
          type="number"
          value={slippage}
          onChange={e => handleSlippageChange(e)}
          className="w-16 h-8 rounded-lg bg-[#212429] border-2 border-gray-300 px-2 focus:outline-none focus:border-blue-500"
        />
        %
      </div>
    </>
  );

  //TODO fix this thing
  if (tokenOneAmount === "") {
    fetchPrices(tokenOne.address, tokenTwo.address);
  }

  return (
    <>
      {contextHolder}
      <Modal open={isTokenPickerOpen} footer={null} onCancel={() => setIsTokenPickerOpen(false)} title="Select a token">
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
      <Modal open={isConfirmationOpen} footer={null} onCancel={() => setIsConfirmationOpen(false)} title="Confirm Swap">
        <div className={styles.confirmationModalContent}>
          Swap information
          <div className="flex-grow items-centre border border-[#3a4157] rounded-lg p-4 shadow-md bg-[#212429] relative">
            <div className="flex items-centre">
              <div className="flex grow items-center ">
                <img src={tokenOne?.img} alt={`${tokenOne?.ticker} Logo`} className="h-6 w-6 mr-2" />
                <div className="text-lg font-semibold">{`${tokenOneAmount} ${tokenOne?.ticker}`}</div>
              </div>
              <div className="text-gray-500 mx-2">
                <ArrowSmallDownIcon className=" -rotate-90 z-10 h-8 p-1 bg-[#212429] border-4 border-zinc-900 text-zinc-300 rounded-xl cursor-pointer hover:scale-110" />
              </div>

              <div className="flex grow items-center">
                <img src={tokenTwo?.img} alt={`${tokenTwo?.ticker} Logo`} className="h-6 w-6 mr-2" />
                <div className="text-lg font-semibold">{`${parseFloat(Number(tokenTwoLimitAmount).toFixed(5))} ${
                  tokenTwo.ticker
                }`}</div>
              </div>
            </div>
            <div className="text-gray-400 text mt-2">
              You are swapping {tokenOneAmount} {tokenOne?.ticker} for atleast{" "}
              {parseFloat(Number(tokenTwoLimitAmount).toFixed(5))} {tokenTwo?.ticker}
            </div>
          </div>
          <div className="font-bold">Current Exchange Rates:</div>
          <div className="pl-2">
            1 {tokenOne.ticker} ={" "}
            <a
              className="underline text-blue-400 hover:cursor-pointer"
              onClick={() => setTokenOneLimitPrice(prices.toString())}
            >
              {prices.toFixed(5)} {tokenTwo.ticker}
            </a>
          </div>
          <div className="pl-2">
            {tokenOneAmount == "" ? 0 : tokenOneAmount} {tokenOne.ticker} = {tokenTwoAmount} {tokenTwo.ticker}
          </div>
          <div className="font-bold">Limit Exchange Rates:</div>
          <div className="pl-2">
            1 {tokenOne.ticker} ={tokenOneLimitPrice} {tokenTwo.ticker}
          </div>
          <div className="pl-2">
            {tokenOneAmount == "" ? 0 : tokenOneAmount} {tokenOne.ticker} = {tokenTwoLimitAmount} {tokenTwo.ticker}
          </div>
          <div className="font-bold">Slippage:</div>
          <div className="pl-2">{slippage}</div>
          <button className={getSwapBtnClassName()} onClick={executeSwap}>
            {swapping ? (
              <div className="flex justify-center items-center">
                <LoaderIcon className="p-2 w-full align-center"></LoaderIcon>{" "}
              </div>
            ) : address == null ? (
              "Connect Wallet"
            ) : (
              "Swap"
            )}
          </button>
        </div>
      </Modal>

      <div className="bg-zinc-900 pt-2 pb-4 px-6 rounded-xl">
        <div className="flex items-center justify-between py-3 px-1">
          <div className="flex space-x-2">
            <Select
              defaultValue={exchangeType}
              onChange={setExchangeType}
              popupMatchSelectWidth={false}
              options={Array.from(exchangeTypes.entries()).map(([key, label]) => ({
                label,
                value: key,
              }))}
              className="rounded-lg "
            />
            <Select
              defaultValue={orderType}
              onChange={setOrderType}
              popupMatchSelectWidth={false}
              options={Array.from(orderTypes.entries()).map(([key, label]) => ({
                label,
                value: key,
              }))}
            />
          </div>
          <div>
            <Popover content={settings} title="Settings" trigger="click" placement="bottomRight">
              <SettingOutlined className="h-6 px-2" />
            </Popover>
            <ReloadOutlined className="h-6" onClick={reload} />
          </div>
        </div>
        <div className={styles.inputTile}>
          <div className="text-xs text-gray-500 absolute top-1">You sell</div>

          <div className={styles.inputFlex}>
            <div>
              <input
                placeholder="0"
                className={styles.inputField}
                defaultValue={tokenOneAmount?.toString()}
                onChange={e => {
                  setTokenOneAmount(e.target.value);
                }}
                // disabled={!prices}
              />
            </div>
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
          {orderType === OrderTypes.LimitOrder ? (
            <div className="text-xs text-gray-500 absolute top-1">You get atleast</div>
          ) : orderType === OrderTypes.MarketOrder ? (
            <div className="text-xs text-gray-500 absolute top-1">You get</div>
          ) : orderType === OrderTypes.StopMarketOrder ? (
            <div className="text-xs text-gray-500 absolute top-1">You get</div>
          ) : (
            <></>
          )}

          <div className={styles.inputFlex}>
            <input
              placeholder="0"
              className={styles.inputField + " text-gray-400"}
              defaultValue={tokenTwoLimitAmount}
              disabled={true}
            />
            <div className={styles.assetStyle} onClick={() => openModal(2)}>
              <img src={tokenTwo.img} alt="assetTwoLogo" className="h-5 ml-2" />
              {tokenTwo.ticker}
              <DownOutlined rev={undefined} />
            </div>
          </div>
        </div>

        {orderType != OrderTypes.MarketOrder ? (
          <>
            <Divider style={{ borderColor: "grey", borderWidth: "0.5" }}>
              <div className="text-sm text-gray-200">
                You want to {orderType === OrderTypes.LimitOrder ? "buy it" : "sell it"} at
              </div>
            </Divider>

            <div className="flex flex-row items-center">
              1 {tokenOne.ticker} {orderType === OrderTypes.LimitOrder ? ">=" : "<="}
              <div className={styles.inputTileSmall}>
                <div className={styles.inputFlex}>
                  <input
                    placeholder="0"
                    className={styles.inputFiledSmall}
                    value={tokenOneLimitPrice?.toString()}
                    onChange={e => {
                      setTokenOneLimitPrice(e.target.value);
                    }}
                    // disabled={!prices}
                  />
                </div>
              </div>
              {tokenTwo.ticker}
            </div>
          </>
        ) : (
          <></>
        )}

        {orderType === OrderTypes.StopMarketOrder ? (
          <div className="flex flex-row items-center">{settings}</div>
        ) : (
          <></>
        )}

        <div className={styles.lableStyle}>
          <div className="font-bold">Current Exchange Rates:</div>
          <div className="pl-2">
            1 {tokenOne.ticker} ={" "}
            <a
              className="underline text-blue-400 hover:cursor-pointer"
              onClick={() => setTokenOneLimitPrice(prices.toString())}
            >
              {prices.toFixed(5)} {tokenTwo.ticker}
            </a>
          </div>
          {/* <div className="pl-2">
            1 {tokenTwo.ticker} ={" "}
            <a
              className="underline text-blue-400 hover:cursor-pointer"
              onClick={() => setTokenOneLimitPrice(prices.toString())}
            >
              {(1 / prices).toFixed()} {tokenOne.ticker}
            </a>
          </div> */}
          <div className="pl-2">
            {tokenOneAmount === "" ? 0 : tokenOneAmount} {tokenOne.ticker} = {tokenTwoAmount} {tokenTwo.ticker}
          </div>
          {/* <div className="pl-2">
            Buy at 1 {tokenOne.ticker} = {tokenOneLimitPrice} {tokenTwo.ticker}
          </div>
          <div className="pl-2">
            Buy at {tokenOneAmount} {tokenOne.ticker} = {tokenTwoLimitAmount} {tokenTwo.ticker}
          </div> */}
        </div>

        <button
          className={getSwapBtnClassName()}
          onClick={() => {
            if (Number(tokenOneLimitPrice) <= prices && orderType === OrderTypes.LimitOrder) {
              notificationApi["error"]({
                message: "Invalid Limit Price",
                description: "The Limit price can't be smaller than current market price for Limit Order",
              });
              return;
            }
            if (Number(tokenOneLimitPrice) >= prices && orderType === OrderTypes.StopMarketOrder) {
              notificationApi["error"]({
                message: "Invalid Limit Price",
                description: "The Stop price can't be greater than current market price for Stop Market Order",
              });
              return;
            }
            setIsConfirmationOpen(true);
          }}
        >
          {address == null ? "Connect Wallet" : "Swap"}
        </button>
      </div>

      <div className="bg-zinc-900 pt-2 pb-4 px-6 rounded-xl w-[35%] " style={{ color: "white", marginLeft: "2rem" }}>
        <div className="flex items-center justify-start py-3 px-1">
          <div>Your Orders:</div>
          <div className="bg-[#212429] px-2 p-1 rounded-lg mx-3">{userOperations.length}</div>
        </div>

        {userOperationsLoading ? (
          <div className={styles.lableStyle}>Loading...</div>
        ) : (
          <>
            {userOperations && userOperations.length > 0 ? (
              userOperations.map(userOp => {
                const _tokenOne = tokenList.find(token => token.address === userOp.swapParams.args[2][0]);
                const _tokenTwo = tokenList.find(token => token.address === userOp.swapParams.args[2][1]);
                const _tokenOneAmount = formatUnits(
                  userOp.swapParams.args[0].toString(),
                  _tokenOne?.decimals || 18,
                ).toString();
                const _tokenTwoAmount = formatUnits(
                  userOp.swapParams.args[1].toString(),
                  _tokenTwo?.decimals || 18,
                ).toString();

                return (
                  <>
                    <div className="flex-grow items-centre border border-[#3a4157] rounded-lg p-4 shadow-md bg-[#212429] relative">
                      <div
                        className="absolute top-0 right-1 text-gray-300 hover:text-gray-500 cursor-pointer"
                        onClick={() => {
                          deleteOrder(userOp);
                        }}
                      >
                        <CloseCircleOutlined className=" text-gray-500 hover:text-gray-500 cursor-pointer" />
                      </div>

                      <div className="flex items-centre">
                        <div className="flex grow items-center ">
                          <img src={_tokenOne?.img} alt={`${_tokenOne?.ticker} Logo`} className="h-6 w-6 mr-2" />
                          <div className="text-lg font-semibold">{`${_tokenOneAmount} ${_tokenOne?.ticker}`}</div>
                        </div>
                        <div className="text-gray-500 mx-2">
                          <ArrowSmallDownIcon className=" -rotate-90 z-10 h-8 p-1 bg-[#212429] border-4 border-zinc-900 text-zinc-300 rounded-xl cursor-pointer hover:scale-110" />
                        </div>

                        <div className="flex grow items-center">
                          <img src={_tokenTwo?.img} alt={`${_tokenTwo?.ticker} Logo`} className="h-6 w-6 mr-2" />
                          <div className="text-lg font-semibold">{`${parseFloat(Number(_tokenTwoAmount).toFixed(5))} ${
                            tokenTwo.ticker
                          }`}</div>
                        </div>
                      </div>
                      <div className="text-gray-400 text mt-2">
                        You are swapping {_tokenOneAmount} {_tokenOne?.ticker} for atleast{" "}
                        {parseFloat(Number(_tokenTwoAmount).toFixed(5))} {_tokenTwo?.ticker}
                      </div>
                    </div>
                    {/* <div className="flex">
                      <div>
                        <div className={styles.lableStyle}>
                          Swap -{" "}
                          {}
                        </div>
                        <div className={styles.lableStyle}>
                          Limit Order Price For Token 2 -{" "}
                          {formatUnits(userOp.swapParams.args[1].toString(), _tokenTwo?.decimals || 18).toString()}
                        </div>
                      </div>

                      <div className="flex">
                        <div className={styles.lableStyle}>
                          <img src={_tokenOne?.img} alt="assetOneLogo" className="h-5 ml-2" />
                          {_tokenOne?.ticker}
                        </div>
                        {"  => "}
                        <div className={styles.lableStyle}>
                          <img src={_tokenTwo?.img} alt="assetOneLogo" className="h-5 ml-2" />
                          {_tokenTwo?.ticker}
                        </div>
                        <div
                          onClick={() => {
                            deleteOrder(userOp);
                          }}
                        >
                          <XMarkIcon className="w-6 h-6 text-gray-500" />
                        </div>
                      </div>
                    </div> */}
                  </>
                );
              })
            ) : (
              <div className={styles.lableStyle}>No user Operations</div>
            )}
          </>
        )}

        {/* <button
          className={getSwapBtnClassName()}
          onClick={() => {
            //fetchDexSwap()
          }}
        >
          {address === null ? "Connect Wallet" : "Swap"}
        </button> */}
      </div>
    </>
  );

  function getSwapBtnClassName() {
    let className = "p-4 wa w-full my-2 content-around rounded-xl";
    className +=
      address === null || tokenOneAmount === "0" ? " text-zinc-400 bg-zinc-800 pointer-events-none" : " bg-blue-700";
    className += needToIncreaseAllowance ? " bg-yellow-600" : "";
    return className;
  }
}

export default Swap;

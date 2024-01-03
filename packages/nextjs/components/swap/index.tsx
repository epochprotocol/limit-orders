import { createContext, useCallback, useEffect, useState } from "react";
import uniswapList from "../../components/assets/uniswapList.json";
import jsonData from "../../public/dexesAddresses.json";
import { GatingPopup } from "../common/GatingPopup";
import { WalletOnboarding } from "../common/WalletOnboarding";
// import tokenList from "../../components/assets/tokenList.json";
import { CloseCircleOutlined, DownOutlined, LinkOutlined, ReloadOutlined, SettingOutlined } from "@ant-design/icons";
import { AdvancedUserOperationStruct } from "@epoch-protocol/sdk/dist/src/AdvancedUserOp";
import { Divider, Modal, Popover, Radio, Select, notification } from "antd";
import { NotificationPlacement } from "antd/es/notification/interface";
import { BigNumber } from "ethers";
import { LoaderIcon } from "react-hot-toast";
import { encodeFunctionData, formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ArrowSmallDownIcon } from "@heroicons/react/24/outline";
import UniswapV2FactoryABI from "~~/contracts/UniswapV2FactoryABI";
import UniswapV2Router02ABI from "~~/contracts/UniswapV2Router02ABI";
import { useArbitaryContract } from "~~/hooks/scaffold-eth/useArbitaryContract";
import { useFetchExecutedUserOperations } from "~~/hooks/scaffold-eth/useFetchExecutedUserOperations";
import { useFetchUserOperations } from "~~/hooks/scaffold-eth/useFetchUserOperations";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useBundler } from "~~/hooks/useBundler";
import { useUserSCWallet } from "~~/hooks/useUserSCWallet";
import { useEthersProvider, useEthersSigner } from "~~/utils/scaffold-eth/common";

function Swap() {
  const styles = {
    assetStyle:
      "absolute h-8 bg-[#3a4157] flex justify-start items-center font-bold text-base pr-2 top-[25px] right-[20px] rounded-full gap-[5px] hover:cursor-pointer",
    modalContent: "mt-5 mb-2 flex flex-col border-t-1 border-solid border-[#363e54] gap-[10px]",
    confirmationModalContent: "p-5 flex flex-col border-t-1 border-solid border-[#363e54] gap-[10px] ",
    inputTile: "relative bg-[#212429] p-4 py-6 rounded-xl mb-2 border-[2px] border-transparent hover:border-zinc-600",
    inputTileSmall:
      "relative bg-[#212429] m-2 p-1 py-2 rounded-xl mb-2 border-[1px] border-outlined hover:border-zinc-600",
    inputField: "w-full outline-none h-8 px-2 appearance-none text-3xl bg-transparent",
    inputFiledSmall: "w-full outline-none h-4 px-2 appearance-none text-lg bg-transparent",
    inputFlex: "flex items-center rounded-xl",
    lableStyle: "text-gray-400 text-xs",
  };

  enum OrderTypes {
    LimitOrder,
    MarketOrder,
    StopMarketOrder,
  }
  const orderTypes: Map<OrderTypes, string> = new Map([
    [OrderTypes.LimitOrder, "Limit Order"],
    [OrderTypes.MarketOrder, "Market Order"],
    [OrderTypes.StopMarketOrder, "Stop-Market Order"],
  ]);

  // useState Hooks
  const [tokenList, setTokenList] = useState<TokenPair[]>((uniswapList as any)["1"]["Uniswap"]);
  const [slippage, setSlippage] = useState(2.5);
  const [tokenOneAmount, setTokenOneAmount] = useState<string>("");
  const [tokenTwoAmount, setTokenTwoAmount] = useState<string>("");
  const [tokenOneLimitPrice, setTokenOneLimitPrice] = useState<string>("");
  const [tokenTwoLimitAmount, setTokenTwoLimitAmount] = useState<string>("");
  const [tokenOne, setTokenOne] = useState(tokenList[0]["tokenOne"]);
  const [tokenTwo, setTokenTwo] = useState(tokenList[0]["tokenTwo"]);
  const [isTokenPickerOpen, setIsTokenPickerOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [prices, setPrices] = useState<number>(0);
  const [txDetails, setTxDetails] = useState({
    to: null,
    data: null,
    value: null,
  });
  const [needToIncreaseAllowance, setNeedToIncreaseAllowance] = useState<boolean>(false);
  const [chainData, setChainData] = useState<ChainData | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  const [routerAdd, setRouterAdd] = useState<string | null>(null);
  const [factoryAdd, setFactoryAdd] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<OrderTypes>(OrderTypes.LimitOrder!);
  const Context = createContext({ name: "Default" });

  // Other Hooks
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const [notificationApi, contextHolder] = notification.useNotification();
  const provider = useEthersProvider();
  const signer = useEthersSigner();
  const { data: walletClient } = useWalletClient();
  const { data: uniswapRouter } = useArbitaryContract({
    contractName: "UNISWAP_ROUTER02",
    contractAddress: routerAdd!,
    abi: UniswapV2Router02ABI,
    walletClient,
  });
  const { data: uniswapFactory } = useArbitaryContract({
    contractName: "UNISWAP_FACTORY",
    contractAddress: factoryAdd!,
    abi: UniswapV2FactoryABI,
    walletClient,
  });
  const { walletAPI, bundler } = useBundler();
  const userSCWalletAddress = useUserSCWallet();
  const {
    userOperations,
    loading: userOperationsLoading,
    fetchOpenOrders,
  } = useFetchUserOperations(userSCWalletAddress);
  const {
    data: executedUserOperations,
    refetch,
    isLoading: executedUserOperationsLoading,
  } = useFetchExecutedUserOperations(userSCWalletAddress, routerAdd!);

  const fetchPrices = useCallback(
    async (one: string, two: string) => {
      try {
        // console.log(parseEther(tokenOneAmount.toString()));
        console.log("publicClient: ", publicClient);
        console.log("IFcondition", routerAdd);
        const args = [BigInt(parseUnits("1", tokenOne.decimals).toString()), [one, two]];
        if (uniswapRouter && routerAdd) {
          console.log("sending fecth");

          // const data: any = useArbitaryContractRead({
          //   functionName: "getAmountsOut",
          //   contractAddress: routerAdd,
          //   abi: uniswapRouter02!.abi,
          //   args,
          // });
          const data: any = await uniswapRouter.read.getAmountsOut(args);

          if (data) {
            console.log("data: ", data);

            const price = Number(formatUnits(data[1] as bigint, tokenTwo.decimals));
            // console.log("price: ", price);
            console.log("price have arrived", price);
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
      } catch (error) {
        return 0;
      }
    },
    [publicClient, routerAdd, tokenOne.decimals, tokenOneAmount, tokenOneLimitPrice, tokenTwo.decimals, uniswapRouter],
  );

  // useEffect Below
  useEffect(() => {
    const fetchData = async () => {
      const chainID = targetNetwork.id.toString();
      try {
        if (jsonData && chainID) {
          // const response = await fetch("/dexesAddresses.json");
          // const jsonData: ChainData = await response.json();
          setChainData(jsonData as ChainData);
          // setChainID(Object.keys(jsonData[0])[0]);
          // Set the default selected exchange when data is loaded
          const selection = Object.keys((jsonData as ChainData)[chainID])[0];
          setSelectedExchange(selection);
          setRouterAdd((jsonData as ChainData)[chainID][selection].UNISWAP_ROUTER02);
          setFactoryAdd((jsonData as ChainData)[chainID][selection].UNISWAP_FACTORY);
          console.log("calling fectch");
          setTokenList((uniswapList as any)[chainID][selection] ?? []);
          // setTokenList(uniswapList[chainID][selection]);
        }
      } catch (error) {
        console.error("Error loading JSON data:", error);
      }
    };

    fetchData();
  }, [targetNetwork.id, targetNetwork]);

  useEffect(() => {
    const chainID = targetNetwork.id;
    if (chainData && selectedExchange && chainID) {
      console.log("qweqweqwechainID: ", chainID);
      console.log("qweqweqweselectedExchange: ", selectedExchange);
      console.log("qweqweqwechainData: ", chainData);
      console.log("qweqweqwechanigng router");
      setRouterAdd(chainData[chainID][selectedExchange].UNISWAP_ROUTER02);
      setFactoryAdd(chainData[chainID][selectedExchange].UNISWAP_FACTORY);
      setTokenList((uniswapList as any)[chainID][selectedExchange] ?? []);
    }
  }, [selectedExchange, chainData, targetNetwork]);

  useEffect(() => {
    setTokenOne(tokenList[0]["tokenOne"]);
    setTokenTwo(tokenList[0]["tokenTwo"]);
  }, [tokenList]);

  useEffect(() => {
    fetchPrices(tokenOne.address, tokenTwo.address);
  }, [tokenOne, tokenTwo, fetchPrices]);

  useEffect(() => {
    if (tokenOneAmount) fetchPrices(tokenOne.address, tokenTwo.address);
  }, [tokenOne, tokenTwo, tokenOneAmount, fetchPrices]);

  useEffect(() => {
    setTokenTwoLimitAmount((Number(tokenOneLimitPrice) * Number(tokenOneAmount)).toString());
  }, [tokenOneLimitPrice, tokenOneAmount, tokenOne, tokenTwo]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (userSCWalletAddress && userSCWalletAddress !== "") {
        refetch();
        fetchOpenOrders();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [userSCWalletAddress, fetchOpenOrders, refetch]);

  // Helper Functions here
  function handleSlippageChange(e: any) {
    setSlippage(e.target.value);
  }

  async function reload() {
    setTokenOneAmount("0");
    setTokenTwoAmount("0");

    setSlippage(2.5);
    setTokenOneLimitPrice("");
    setTokenTwoLimitAmount("");
    setTokenOne(tokenList[0]["tokenOne"]);
    setTokenTwo(tokenList[0]["tokenTwo"]);
    setIsTokenPickerOpen(false);
    setIsConfirmationOpen(false);
    // setChangeToken(1);
    setPrices(0);
    setTxDetails({
      to: null,
      data: null,
      value: null,
    });
    setNeedToIncreaseAllowance(false);
  }

  async function switchTokens() {
    setPrices(0);
    setTokenOneAmount("0");
    setTokenTwoAmount("0");
    const one = tokenOne;
    const two = tokenTwo;
    setTokenOne(two);
    setTokenTwo(one);

    const price = await fetchPrices(two.address, one.address);

    setTokenOneLimitPrice(price.toString());
    setTokenTwoLimitAmount((Number(tokenOneLimitPrice) * Number(tokenOneAmount)).toString());
  }

  function openModal() {
    setIsTokenPickerOpen(true);
  }

  function modifyToken(i: number) {
    setPrices(0);
    setTokenOneAmount("0");
    setTokenTwoAmount("0");
    // if (changeToken === 1) {
    setTokenOne(tokenList[i]["tokenOne"]);
    // } else {
    setTokenTwo(tokenList[i]["tokenTwo"]);
    // }
    setIsTokenPickerOpen(false);
  }

  async function executeSwap() {
    try {
      if (
        signer &&
        provider &&
        address &&
        tokenOne &&
        tokenTwo &&
        uniswapRouter &&
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
            abi: uniswapRouter?.abi as unknown as any,
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
            abi: uniswapRouter?.abi as unknown as any,
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
          target: routerAdd!,
          data,
          maxFeePerGas: BigNumber.from("1500000032"),
          maxPriorityFeePerGas: BigNumber.from("1500000000"),
          gasLimit: BigNumber.from("1500320"),
          value: 0n,
        });
        console.log("unsignedUserOp: ", unsignedUserOp);
        console.log("uniswapRouter02: ", uniswapRouter?.address);
        console.log(txDetails);

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

        const nonce = await walletAPI.getNonce(key);

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

        const userOpHash = await bundler.sendUserOpToBundler(advancedOp);
        const txid = await walletAPI.getUserOpReceipt(userOpHash);
        console.log("reqId", userOpHash, "txid=", txid);
      }
    } catch (error) {
      console.log("error: ", error);
    }
    setSwapping(false);
    setIsConfirmationOpen(false);
  }
  async function deleteOrder(userOp: any) {
    if (signer && provider && bundler && walletAPI) {
      try {
        const op = await walletAPI.createSignedUserOp({
          target: userSCWalletAddress,
          data: "0x",
          value: 0n,
          nonce: BigInt(userOp.userOp.nonce).toString(),
        });

        const deployWalletUserOp = await bundler.deleteAdvancedUserOpFromBundler(op);
        console.log("deployWalletUserOp: ", deployWalletUserOp);
        openDeleteNotification("topRight");
      } catch (error) {
        console.log("error: ", error);
      }
    }
  }
  async function openDeleteNotification(placement: NotificationPlacement) {
    notificationApi.info({
      message: `Order Submitted for Deletion`,
      description: <Context.Consumer>{() => `Your order should be deleted in some time`}</Context.Consumer>,
      placement,
    });
  }
  function getSwapBtnClassName() {
    let className = "p-4 wa w-full my-2 content-around rounded-xl";
    className +=
      address === null || tokenOneAmount === "0" ? " text-zinc-400 bg-zinc-800 pointer-events-none" : " bg-blue-700";
    className += needToIncreaseAllowance ? " bg-yellow-600" : "";
    return className;
  }

  // Other smaller components
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

  // // TODO fix this thing
  // if (tokenOneAmount === "" && tokenOneLimitPrice === "" && tokenTwoLimitAmount === "") {
  //   fetchPrices(tokenOne.address, tokenTwo.address);
  // }

  return (
    <>
      {contextHolder}
      <GatingPopup />
      <Modal open={isTokenPickerOpen} footer={null} onCancel={() => setIsTokenPickerOpen(false)} title="Select a pair">
        <div className={styles.modalContent}>
          {tokenList?.map((e, i) => {
            return (
              <div
                className="flex justify-start items-center pl-5 pt-2 pb-2 mx-2 hover:cursor-pointer hover:bg-gray-800 border-[1px] border-gray-800 rounded-lg"
                key={i}
                onClick={() => modifyToken(i)}
              >
                <img src={e.tokenOne.img} alt={e.tokenOne.ticker} className="h-10 w-10" />
                <div className="tokenChoiceNames">
                  <div className="ml-2 text-base font-medium">{e.tokenOne.name}</div>
                  <div className="ml-2 text-xs font-light text-gray-500">{e.tokenOne.ticker}</div>
                </div>
                <ArrowSmallDownIcon className="rotate-[-90deg] h-10 px-4 py-2 text-zinc-300 rounded-xl " />
                <img src={e.tokenTwo.img} alt={e.tokenTwo.ticker} className="h-10 w-10" />
                <div className="tokenChoiceNames">
                  <div className="ml-2 text-base font-medium">{e.tokenTwo.name}</div>
                  <div className="ml-2 text-xs font-light text-gray-500">{e.tokenTwo.ticker}</div>
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
      <WalletOnboarding />

      {
        // Create options for the exchange select
      }
      <div className="bg-zinc-900 pt-2 pb-4 px-6 rounded-xl">
        <div className="flex items-center justify-between py-3 px-1">
          <div className="flex space-x-2">
            {/* Uncomment this to change dexes */}
            <Select
              options={Array.from(Object.keys(chainData ? chainData[targetNetwork.id] : []).entries()).map(
                ([, label]) => ({
                  label,
                  value: label,
                }),
              )}
              value={selectedExchange}
              onChange={setSelectedExchange}
              popupMatchSelectWidth={false}
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
              <SettingOutlined className="h-6 px-2" rev={undefined} />
            </Popover>
            <ReloadOutlined className="h-6" onClick={reload} rev={undefined} />
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
            <div className={styles.assetStyle} onClick={() => openModal()}>
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
            <div className={styles.assetStyle} onClick={() => openModal()}>
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
          <div className="pl-2 flex grow">
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

      <div className="bg-zinc-900 pt-2 pb-4 px-6 rounded-xl w-[35%]" style={{ color: "white", marginLeft: "2rem" }}>
        <div className="flex items-center justify-start py-3 px-1">
          <div>Your Open Orders:</div>
          <div className="bg-[#212429] px-2 p-1 rounded-lg mx-3">{userOperations.length}</div>
        </div>

        {userOperationsLoading ? (
          <div className={styles.lableStyle}>Loading...</div>
        ) : (
          <div className="overflow-y-auto h-[30vh]">
            {userOperations && userOperations.length > 0 ? (
              userOperations.map(userOp => {
                const _tokenOneAddress = userOp.swapParams.args[2][0];
                const _tokenTwoAddress = userOp.swapParams.args[2][1];

                // Find _tokenOne and _tokenTwo in the tokenList based on their addresses
                let _tokenOne:
                  | {
                      ticker: string;
                      img: string;
                      name: string;
                      address: string;
                      decimals: number;
                    }
                  | any = null;
                let _tokenTwo:
                  | {
                      ticker: string;
                      img: string;
                      name: string;
                      address: string;
                      decimals: number;
                    }
                  | any = null;

                tokenList.forEach(token => {
                  if (token.tokenOne.address === _tokenOneAddress) {
                    _tokenOne = token.tokenOne;
                    return;
                  } else if (token.tokenTwo.address === _tokenOneAddress) {
                    _tokenOne = token.tokenTwo;
                    return;
                  }
                });
                tokenList.forEach(token => {
                  if (token.tokenOne.address === _tokenTwoAddress) {
                    _tokenTwo = token.tokenOne;
                    return;
                  } else if (token.tokenTwo.address === _tokenTwoAddress) {
                    _tokenTwo = token.tokenTwo;
                    return;
                  }
                });
                // Check if _tokenOne and _tokenTwo are found in the tokenList
                if (!_tokenOne || !_tokenTwo) {
                  console.error("Token not found in tokenList");
                }

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
                    <div className="flex-grow items-centre border border-[#3a4157] rounded-lg p-4 shadow-md bg-[#212429] relative mb-2">
                      <div
                        className="absolute top-0 right-1 text-gray-300 hover:text-gray-500 cursor-pointer"
                        onClick={() => {
                          deleteOrder(userOp);
                        }}
                      >
                        <CloseCircleOutlined
                          className=" text-gray-500 hover:text-gray-500 cursor-pointer"
                          rev={undefined}
                        />
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
                            _tokenTwo?.ticker
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
          </div>
        )}
        {/* <div className="flex-col">
          <div>{targetNetwork.id}</div>
          <div>{routerAdd}</div>
          <div> {factoryAdd}</div>
        </div> */}

        {/* <button
          className={getSwapBtnClassName()}
          onClick={() => {
            //fetchDexSwap()
          }}
        >
          {address === null ? "Connect Wallet" : "Swap"}
        </button> */}
        <div className="flex items-center justify-start py-3 px-1">
          <div>Your Completed Orders:</div>
          <div className="bg-[#212429] px-2 p-1 rounded-lg mx-3">
            {executedUserOperations ? executedUserOperations.length : 0}
          </div>
        </div>
        {executedUserOperationsLoading ? (
          <div className={styles.lableStyle}>Loading...</div>
        ) : (
          <div className="overflow-y-auto h-[30vh]">
            {executedUserOperations && executedUserOperations.length > 0 ? (
              executedUserOperations.map(userOp => {
                const _tokenOneAddress = userOp.swapParams.args[2][0];
                const _tokenTwoAddress = userOp.swapParams.args[2][1];

                // Find _tokenOne and _tokenTwo in the tokenList based on their addresses
                let _tokenOne:
                  | {
                      ticker: string;
                      img: string;
                      name: string;
                      address: string;
                      decimals: number;
                    }
                  | any = null;
                let _tokenTwo:
                  | {
                      ticker: string;
                      img: string;
                      name: string;
                      address: string;
                      decimals: number;
                    }
                  | any = null;

                tokenList.forEach(token => {
                  if (token.tokenOne.address === _tokenOneAddress) {
                    _tokenOne = token.tokenOne;
                    return;
                  } else if (token.tokenTwo.address === _tokenOneAddress) {
                    _tokenOne = token.tokenTwo;
                    return;
                  }
                });
                tokenList.forEach(token => {
                  if (token.tokenOne.address === _tokenTwoAddress) {
                    _tokenTwo = token.tokenOne;
                    return;
                  } else if (token.tokenTwo.address === _tokenTwoAddress) {
                    _tokenTwo = token.tokenTwo;
                    return;
                  }
                });
                // Check if _tokenOne and _tokenTwo are found in the tokenList
                if (!_tokenOne || !_tokenTwo) {
                  console.error("Token not found in tokenList");
                }

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
                    <div className="flex-grow items-centre border border-[#3a4157] rounded-lg p-4 shadow-md bg-[#212429] relative mb-2 ">
                      <div className="absolute top-0 right-1 text-gray-300 hover:text-gray-500 cursor-pointer">
                        <a target="_" href={`https://mumbai.polygonscan.com/tx/${userOp.transactionHash}`}>
                          <LinkOutlined className=" text-gray-500 hover:text-gray-500 cursor-pointer" rev={undefined} />
                        </a>
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
                            _tokenTwo?.ticker
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
          </div>
        )}
      </div>
    </>
  );
}

export default Swap;

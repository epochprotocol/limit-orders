type RouterData = {
    UNISWAP_ROUTER02: string;
    UNISWAP_FACTORY: string;
};

type ExchangeData = {
    [exchange: string]: RouterData;
};

type ChainData = {
    [chainId: string]: ExchangeData;
};

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

interface Token {
    name: string;
    decimals: number;
    address: string;
    img: string;
    ticker: string;
}

interface TokenPair {
    tokenOne: Token;
    tokenTwo: Token;
}

interface TokenExchangeData {
    [key: string]: TokenPair[];
}

interface NetworkData {
    [key: string]: {
        [key: string]: TokenExchangeData;
    };
}

interface TokenData {
    [key: string]: NetworkData;
}

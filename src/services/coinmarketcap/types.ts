export interface CMCQuote {
  id: number;
  symbol: string;
  name: string;
  price: number;
  changePercent24h: number;
  changePercent7d: number;
  volume24h: number;
  marketCap: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number;
  lastUpdated: Date;
}

export interface CMCSymbolData {
  id: number;
  symbol: string;
  name: string;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  quote: {
    USD: {
      price: number;
      volume_24h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      market_cap: number;
      last_updated: string;
    };
  };
}

export interface CMCResponse<T> {
  status: {
    timestamp: string;
    error_code: number | null;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
  };
  data: T;
}

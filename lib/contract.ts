import { ethers } from 'ethers';

// BNB Testnet RPC
const RPC_URL = 'https://bnb-testnet.g.alchemy.com/v2/PGrtGwcAYDbXyA05A6K93YdMneRYdebL';
// GameScore contract address
const CONTRACT_ADDRESS = '0x9C6C9D9848f8b5D5a5104d6537f8E2f754d03682';
// GameScore ABI (僅保留查價 function)
const ABI = [
  'function getBTCPrice() public view returns (int256)',
  'function getETHPrice() public view returns (int256)',
  'function getBNBPrice() public view returns (int256)'
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

export async function fetchCryptoPrices() {
  const [btc, eth, bnb] = await Promise.all([
    contract.getBTCPrice(),
    contract.getETHPrice(),
    contract.getBNBPrice()
  ]);
  return {
    btc: Number(btc) / 1e8, // Chainlink 傳回 8 decimals
    eth: Number(eth) / 1e8,
    bnb: Number(bnb) / 1e8
  };
}

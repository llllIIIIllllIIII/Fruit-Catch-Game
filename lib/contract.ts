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

// 偵測是否有安裝錢包（如 MetaMask）
export function detectWallet() {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return true;
  }
  return false;
}

// 連結錢包，回傳使用者地址
export async function connectWallet(): Promise<string | null> {
  if (!detectWallet()) return null;
  try {
    const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
    return accounts[0] || null;
  } catch (err) {
    return null;
  }
}

// 取得 signer 實例（用於需要簽名的合約互動）
export function getSigner() {
  if (!detectWallet()) return null;
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  return provider.getSigner();
}

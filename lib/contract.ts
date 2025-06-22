// RewardToken 合約資訊
const REWARD_TOKEN_ADDRESS = '0x5E6Aed02b3130d8DffB8a88475a77C4070f9Ce63';
const REWARD_TOKEN_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)'
];

// 檢查並自動 approve 足夠額度給 GameRecord 合約
export async function ensureRewardTokenAllowance(minAmount: bigint): Promise<void> {
  const signer = await getSigner();
  if (!signer) throw new Error('No wallet signer');
  const userAddress = await signer.getAddress();
  const token = new ethers.Contract(REWARD_TOKEN_ADDRESS, REWARD_TOKEN_ABI, signer);
  const allowance: bigint = await token.allowance(userAddress, '0x0884fACAE7A88B9CCf7120e24E2b14b5E8314AD6');
  if (allowance < minAmount) {
    const tx = await token.approve('0x0884fACAE7A88B9CCf7120e24E2b14b5E8314AD6', minAmount);
    await tx.wait();
  }
}
// 寫入遊戲紀錄到鏈上
export async function writeGameRecord(
  mood: string,
  quote: string,
  dataURI: string,
  score: number
): Promise<string> {
  const GAME_RECORD_ADDRESS = '0x0884fACAE7A88B9CCf7120e24E2b14b5E8314AD6';
  const ABI = [
    'function play(string mood, string quote, string dataURI, uint256 score) public'
  ];
  const signer = await getSigner();
  if (!signer) throw new Error('No wallet signer');
  const contract = new ethers.Contract(GAME_RECORD_ADDRESS, ABI, signer);
  const tx = await contract.play(mood, quote, dataURI, score);
  await tx.wait();
  return tx.hash;
}
// GameRecord 合約查詢 bestScore
export async function fetchBestScore(address: string): Promise<number> {
  const GAME_RECORD_ADDRESS = '0x0884fACAE7A88B9CCf7120e24E2b14b5E8314AD6';
  const ABI = ['function getBestScore(address) view returns (uint256)'];
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(GAME_RECORD_ADDRESS, ABI, provider);
  const score = await contract.getBestScore(address);
  return Number(score);
}
import { ethers } from 'ethers';

// 從環境變數取得 RPC URL
const RPC_URL = process.env.NEXT_PUBLIC_BNB_RPC_URL!;

// BNB Testnet RPC 已改用 .env.local 管理
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
  const provider = (window as any).ethereum;
  try {
    // 先嘗試切換到 BNB Testnet
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x61' }], // 0x61 = 97 (BNB Testnet)
    });
  } catch (switchError: any) {
    // 如果沒有該網路，則新增
    if (switchError.code === 4902) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x61',
            chainName: 'BNB Smart Chain Testnet',
            rpcUrls: [process.env.NEXT_PUBLIC_BNB_RPC_URL],
            nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
            blockExplorerUrls: ['https://testnet.bscscan.com'],
          }],
        });
      } catch (addError) {
        return null;
      }
    } else {
      return null;
    }
  }
  // 切換成功後請求帳號
  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
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

# Fruit Catch Game (Web3 Edition)

A blockchain-integrated interactive mini-game built with Next.js, TypeScript, and Tailwind CSS. Catch falling crypto coins, with scores dynamically linked to real on-chain prices! Connect your wallet to play and experience Web3 gaming.

## Features
- **Web3 Integration**: Connect MetaMask wallet, interact with smart contracts, and fetch real-time crypto prices (BTC/ETH/BNB) from BNB Testnet via Chainlink.
- **On-chain Price Binding**: Game scores are dynamically calculated based on live on-chain prices.
- **Smart Contract**: Solidity contract deployed on BNB Testnet ([GameScore.sol](contract/contracts/GameScore.sol)).
- **Modern UI/UX**: Responsive, mobile-friendly, and visually appealing with Tailwind CSS.
- **Gameplay**: Speed and fruit drop density increase over time for a challenging experience.
- **Wallet Gating**: Must connect wallet to start the game.
- **React Hooks**: Clean state management and game logic.

## Getting Started

1. **Clone this repository:**
   ```bash
   git clone https://github.com/llllIIIIllllIIII/Fruit-Catch-Game.git
   cd Fruit-Catch-Game
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start the development server:**
   ```bash
   npm run dev
   ```
4. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000)

5. **Connect MetaMask (BNB Testnet):**
   - Make sure MetaMask is installed and switched to BNB Testnet.
   - Click "Connect Wallet" in the top-right to play.

## Tech Stack
- [Next.js](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Ethers.js](https://docs.ethers.org/)
- [Hardhat](https://hardhat.org/) (Solidity, contract deployment)
- [Chainlink Price Feeds](https://docs.chain.link/)

## Project Structure
- `app/` — Main pages and game logic (Next.js App Router)
- `components/` — UI components
- `lib/` — Contract interaction, wallet connect logic
- `contract/` — Hardhat project, Solidity contracts, deployment scripts
- `public/` — Static assets (e.g., images)

## Smart Contract
- **Location:** `contract/contracts/GameScore.sol`
- **Network:** BNB Testnet
- **Deployed Address:** `0x9C6C9D9848f8b5D5a5104d6537f8E2f754d03682`
- **Functions:**
  - `getBTCPrice()`, `getETHPrice()`, `getBNBPrice()` — Fetch on-chain prices via Chainlink

## Contribution
Pull requests and issues are welcome! For major changes, please open an issue first to discuss what you would like to change.

---
Original inspiration: [StackBlitz Online Editor](https://stackblitz.com/~/github.com/joe888777/fruit-catch-game)
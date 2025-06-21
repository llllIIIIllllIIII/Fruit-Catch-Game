'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Apple, Zap, Banana, Clock, Play, Pause, RotateCcw, Trophy } from 'lucide-react';
import { SiBitcoin, SiEthereum, SiBinance } from 'react-icons/si';
import { fetchCryptoPrices, detectWallet, connectWallet } from '../lib/contract';
import moodQuotes from '../public/mood_quotes.json';

interface Fruit {
  id: number;
  x: number;
  y: number;
  type: 'btc' | 'eth' | 'bnb' | 'black_swan'; // 新增 black_swan
  points: number;
  speed: number;
}

interface Player {
  x: number;
  width: number;
}

interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  score: number;
  highScore: number;
  timeLeft: number;
  level: number;
  gameSpeed: number;
}

const FRUIT_TYPES = {
  btc: { icon: SiBitcoin, points: 10, color: 'text-yellow-500', bgColor: 'bg-yellow-500' },
  eth: { icon: SiEthereum, points: 15, color: 'text-blue-500', bgColor: 'bg-blue-500' },
  bnb: { icon: SiBinance, points: 20, color: 'text-yellow-400', bgColor: 'bg-yellow-400' },
  black_swan: { icon: null, points: 0, color: '', bgColor: '' } // 黑天鵝不顯示 icon，直接用圖片
};

const GAME_CONFIG = {
  gameWidth: 800,
  gameHeight: 600,
  playerWidth: 80,
  playerHeight: 20,
  fruitSize: 40,
  initialSpeed: 2.5,
  spawnRate: 0.02,
  maxFruits: 12,
  playerSpeed: 7,
  gameDuration: 5 // 60 seconds
};

const MOODS = [
  { key: 'Hope', label: 'Hope', emoji: '🌟' },
  { key: 'Regret', label: 'Regret', emoji: '🫠' },
  { key: 'Greed', label: 'Greed', emoji: '🤑' },
  { key: 'Loneliness', label: 'Loneliness', emoji: '🫥' },
  { key: 'Calmness', label: 'Calmness', emoji: '😌' }
];

export default function Home() {
  const gameRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const lastSpawnRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const fruitsRef = useRef<Fruit[]>([]);
  const playerRef = useRef<Player>({
    x: GAME_CONFIG.gameWidth / 2 - GAME_CONFIG.playerWidth / 2,
    width: GAME_CONFIG.playerWidth
  });

  const [gameState, setGameState] = useState<GameState & { maxFruits?: number }>({
    isPlaying: false,
    isPaused: false,
    score: 0,
    highScore: 0,
    timeLeft: GAME_CONFIG.gameDuration,
    level: 1,
    gameSpeed: GAME_CONFIG.initialSpeed,
    maxFruits: 4
  });
  // 黑天鵝結束狀態
  const [blackSwanEnded, setBlackSwanEnded] = useState(false);

  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [playerX, setPlayerX] = useState(GAME_CONFIG.gameWidth / 2 - GAME_CONFIG.playerWidth / 2);
  const [cryptoPrices, setCryptoPrices] = useState<{ btc: number; eth: number; bnb: number }>({ btc: 0, eth: 0, bnb: 0 });
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [gameOverBySwan, setGameOverBySwan] = useState(false); // 新增黑天鵝結束狀態
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodQuote, setMoodQuote] = useState<string | null>(null);

  // Load high score from localStorage after component mounts
  useEffect(() => {
    const savedHighScore = localStorage.getItem('fruitGameHighScore');
    if (savedHighScore) {
      setGameState(prev => ({
        ...prev,
        highScore: parseInt(savedHighScore, 10)
      }));
    }
  }, []);

  // Fetch crypto prices from the blockchain when the game starts
  useEffect(() => {
    if (gameState.isPlaying) {
      fetchCryptoPrices().then(setCryptoPrices);
    }
  }, [gameState.isPlaying]);

  // 進入頁面時先抓取一次幣價，確保教學面板能顯示分數
  useEffect(() => {
    fetchCryptoPrices().then(setCryptoPrices);
  }, []);

  // 嘗試自動偵測已連結錢包（但不自動彈窗要求連結）
  useEffect(() => {
    if (detectWallet() && (window as any).ethereum.selectedAddress) {
      setWalletAddress((window as any).ethereum.selectedAddress);
    }
  }, []);

  const updateTimer = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    const now = Date.now();
    const elapsed = (now - gameStartTimeRef.current) / 1000;
    const timeLeft = Math.max(0, GAME_CONFIG.gameDuration - elapsed);
    
    setGameState(prev => {
      if (timeLeft <= 0 && prev.isPlaying) {
        return { ...prev, timeLeft: 0, isPlaying: false };
      }
      return { ...prev, timeLeft };
    });
  }, [gameState.isPlaying, gameState.isPaused]);

  const updatePlayer = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    let deltaX = 0;
    if (keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A']) {
      deltaX -= GAME_CONFIG.playerSpeed;
    }
    if (keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D']) {
      deltaX += GAME_CONFIG.playerSpeed;
    }
    
    if (deltaX !== 0) {
      const newX = Math.max(0, Math.min(GAME_CONFIG.gameWidth - GAME_CONFIG.playerWidth, playerRef.current.x + deltaX));
      playerRef.current.x = newX;
      setPlayerX(newX);
    }
  }, [gameState.isPlaying, gameState.isPaused]);

  // 調整 spawnFruit 以支援黑天鵝
  const spawnFruit = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    const now = Date.now();
    const spawnDelay = 800 / gameState.gameSpeed;
    const maxFruits = (gameState as any).maxFruits || 4;
    if (now - lastSpawnRef.current > spawnDelay && fruitsRef.current.length < maxFruits) {
      lastSpawnRef.current = now;
      // 黑天鵝生成機率：等級2以上才有機率（最低）
      let isBlackSwan = false;
      if (gameState.level >= 2 && Math.random() < 0.08) {
        isBlackSwan = true;
      }
      if (isBlackSwan) {
        const newFruit: Fruit = {
          id: now + Math.random(),
          x: Math.random() * (GAME_CONFIG.gameWidth - GAME_CONFIG.fruitSize),
          y: -GAME_CONFIG.fruitSize,
          type: 'black_swan',
          points: 0,
          speed: gameState.gameSpeed + Math.random() * 2
        };
        fruitsRef.current = [...fruitsRef.current, newFruit];
        setFruits([...fruitsRef.current]);
        return;
      }
      // 權重機率：BNB > ETH > BTC
      // 例如 BNB: 50%, ETH: 30%, BTC: 20%
      const weightedTypes: Array<'bnb' | 'eth' | 'btc'> = [
        'bnb','bnb','bnb','bnb','bnb', // 5
        'eth','eth','eth',            // 3
        'btc','btc'                   // 2
      ];
      const randomType = weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
      let points = 0;
      if (randomType === 'btc') points = Math.round(cryptoPrices.btc);
      if (randomType === 'eth') points = Math.round(cryptoPrices.eth);
      if (randomType === 'bnb') points = Math.round(cryptoPrices.bnb);
      const newFruit: Fruit = {
        id: now + Math.random(),
        x: Math.random() * (GAME_CONFIG.gameWidth - GAME_CONFIG.fruitSize),
        y: -GAME_CONFIG.fruitSize,
        type: randomType,
        points,
        speed: gameState.gameSpeed + Math.random() * 2
      };
      fruitsRef.current = [...fruitsRef.current, newFruit];
      setFruits([...fruitsRef.current]);
    }
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameSpeed, cryptoPrices, gameState]);

  const updateFruits = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    fruitsRef.current = fruitsRef.current
      .map(fruit => ({
        ...fruit,
        y: fruit.y + fruit.speed
      }))
      .filter(fruit => fruit.y < GAME_CONFIG.gameHeight + GAME_CONFIG.fruitSize);
    
    setFruits([...fruitsRef.current]);
  }, [gameState.isPlaying, gameState.isPaused]);

  // 調整碰撞檢查，黑天鵝直接結束
  const checkCollisions = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    const playerRect = {
      x: playerRef.current.x,
      y: GAME_CONFIG.gameHeight - GAME_CONFIG.playerHeight - 10,
      width: GAME_CONFIG.playerWidth,
      height: GAME_CONFIG.playerHeight
    };
    let scoreIncrease = 0;
    const fruitsToRemove: number[] = [];
    let hitBlackSwan = false;
    fruitsRef.current.forEach(fruit => {
      const fruitRect = {
        x: fruit.x,
        y: fruit.y,
        width: GAME_CONFIG.fruitSize,
        height: GAME_CONFIG.fruitSize
      };
      // Check collision with player
      if (
        playerRect.x < fruitRect.x + fruitRect.width &&
        playerRect.x + playerRect.width > fruitRect.x &&
        playerRect.y < fruitRect.y + fruitRect.height &&
        playerRect.y + playerRect.height > fruitRect.y
      ) {
        if (fruit.type === 'black_swan') {
          hitBlackSwan = true;
          fruitsToRemove.push(fruit.id);
        } else {
          scoreIncrease += fruit.points;
          fruitsToRemove.push(fruit.id);
        }
      } else if (fruit.y > GAME_CONFIG.gameHeight - GAME_CONFIG.fruitSize) {
        fruitsToRemove.push(fruit.id);
      }
    });
    if (fruitsToRemove.length > 0) {
      fruitsRef.current = fruitsRef.current.filter(fruit => !fruitsToRemove.includes(fruit.id));
      setFruits([...fruitsRef.current]);
    }
    if (hitBlackSwan) {
      setGameState(prev => ({ ...prev, isPlaying: false, timeLeft: 0 }));
      setBlackSwanEnded(true);
      return;
    }
    if (scoreIncrease > 0) {
      setGameState(prev => {
        const newScore = prev.score + scoreIncrease;
        const newHighScore = Math.max(prev.highScore, newScore);
        if (newHighScore > prev.highScore) {
          localStorage.setItem('fruitGameHighScore', newHighScore.toString());
        }
        return {
          ...prev,
          score: newScore,
          highScore: newHighScore
        };
      });
    }
  }, [gameState.isPlaying, gameState.isPaused]);

  const gameLoop = useCallback(() => {
    updateTimer();
    updatePlayer();
    spawnFruit();
    updateFruits();
    checkCollisions();
    
    if (gameState.isPlaying && gameState.timeLeft > 0) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameState.isPlaying, gameState.timeLeft, updateTimer, updatePlayer, spawnFruit, updateFruits, checkCollisions]);

  const startGame = () => {
    fruitsRef.current = [];
    playerRef.current.x = GAME_CONFIG.gameWidth / 2 - GAME_CONFIG.playerWidth / 2;
    gameStartTimeRef.current = Date.now();
    
    setFruits([]);
    setPlayerX(GAME_CONFIG.gameWidth / 2 - GAME_CONFIG.playerWidth / 2);
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      score: 0,
      timeLeft: GAME_CONFIG.gameDuration,
      level: 1,
      gameSpeed: GAME_CONFIG.initialSpeed,
      maxFruits: 4
    }));
    setBlackSwanEnded(false);
  };

  const pauseGame = () => {
    if (gameState.isPaused) {
      // Resume: adjust start time to account for pause duration
      const pauseDuration = Date.now() - gameStartTimeRef.current - (GAME_CONFIG.gameDuration - gameState.timeLeft) * 1000;
      gameStartTimeRef.current += pauseDuration;
    }
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const resetGame = () => {
    fruitsRef.current = [];
    playerRef.current.x = GAME_CONFIG.gameWidth / 2 - GAME_CONFIG.playerWidth / 2;
    
    setFruits([]);
    setPlayerX(GAME_CONFIG.gameWidth / 2 - GAME_CONFIG.playerWidth / 2);
    setGameState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      score: 0,
      timeLeft: GAME_CONFIG.gameDuration,
      level: 1,
      gameSpeed: GAME_CONFIG.initialSpeed,
      maxFruits: 4
    }));
    setBlackSwanEnded(false);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      
      if (e.key === ' ') {
        e.preventDefault();
        if (gameState.isPlaying) {
          pauseGame();
        } else if (gameState.timeLeft > 0) {
          startGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.isPlaying, gameState.timeLeft]);

  // 依據經過的時間自動調整速度與最大掉落數量
  useEffect(() => {
    if (!gameState.isPlaying) return;
    const interval = setInterval(() => {
      setGameState(prev => {
        const elapsed = GAME_CONFIG.gameDuration - prev.timeLeft;
        // 速度每20秒加快一次，前20秒最慢
        const speedUp = Math.floor(elapsed / 20);
        // 前20秒 maxFruits = 4，之後每20秒+4，最多不超過12
        let maxFruits = 4;
        if (elapsed >= 20) maxFruits = Math.min(4 + speedUp * 4, 12);
        return {
          ...prev,
          gameSpeed: GAME_CONFIG.initialSpeed + speedUp * 0.5,
          level: speedUp + 1,
          // 用於 spawnFruit 的 maxFruits
          maxFruits: maxFruits
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.isPlaying]);

  // Game loop
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused && gameState.timeLeft > 0) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, gameState.timeLeft, gameLoop]);

  // 連結錢包流程
  const handleConnectWallet = async () => {
    setWalletConnecting(true);
    const addr = await connectWallet();
    if (addr) setWalletAddress(addr);
    setWalletConnecting(false);
  };

  // 斷開錢包功能
  const handleDisconnectWallet = () => {
    setWalletAddress(null);
    // 可選：如有額外清理邏輯可加在這裡
  };

  // 心情打卡選擇後，隨機選一句名言
  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    const quotes = (moodQuotes as any)[mood] || [];
    if (quotes.length > 0) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setMoodQuote(randomQuote);
    } else {
      setMoodQuote(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 max-w-6xl w-full">
        {/* Header */}
        <div className="relative text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg flex items-center justify-center gap-3">
            <img src="/pepe2.png" alt="left" style={{ width: 40, height: 40 }} className="inline-block align-middle" />
            Coin Island
            <img src="/pepe_cry.png" alt="right" style={{ width: 40, height: 40 }} className="inline-block align-middle" />
          </h1>
          <p className="text-white/80 text-lg">Catch as many coin as possible in 60 seconds!</p>
          {/* Wallet Connect Button - fixed to右上角但不影響標題置中 */}
          <div className="absolute right-0 top-1 flex items-center gap-2 z-10">
            {walletAddress ? (
              <div className="relative">
                <button
                  onClick={() => setShowDisconnect((v) => !v)}
                  className="inline-block bg-green-100 text-green-700 px-4 py-2 rounded-xl font-mono text-sm shadow hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </button>
                {showDisconnect && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                    <button
                      onClick={() => { setShowDisconnect(false); handleDisconnectWallet(); }}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={walletConnecting}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-5 py-2 rounded-xl font-semibold shadow hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200"
              >
                {walletConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>

        {/* Game Stats */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="flex items-center space-x-6">
            <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
              <span className="text-white font-semibold">Score: {gameState.score}</span>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-yellow-300" />
              <span className="text-white font-semibold">Best: {gameState.highScore}</span>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
              <span className="text-white font-semibold">Level: {gameState.level}</span>
            </div>
          </div>
          
          <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm flex items-center space-x-2">
            <Clock className={`w-5 h-5 ${gameState.timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`} />
            <span className={`font-bold text-lg ${gameState.timeLeft <= 10 ? 'text-red-300' : 'text-white'}`}>
              {formatTime(gameState.timeLeft)}
            </span>
          </div>
        </div>

        {/* Game Container */}
        <div className="relative mx-auto bg-gradient-to-b from-sky-200 to-green-200 rounded-2xl overflow-hidden shadow-inner border-4 border-white/30"
             style={{ width: `${GAME_CONFIG.gameWidth}px`, height: `${GAME_CONFIG.gameHeight}px`, maxWidth: '100%' }}>
          {/* 動態背景影片，僅在遊戲進行時顯示 */}
          {gameState.isPlaying && (
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
            >
              <source src="/bg.mp4" type="video/mp4" />
            </video>
          )}
          {/* Game Area */}
          <div ref={gameRef} className="relative w-full h-full z-10">
            {/* Fruits */}
            {fruits.map(fruit => {
              if (fruit.type === 'black_swan') {
                return (
                  <div
                    key={fruit.id}
                    className="absolute"
                    style={{
                      left: `${fruit.x}px`,
                      top: `${fruit.y}px`,
                      width: `${GAME_CONFIG.fruitSize}px`,
                      height: `${GAME_CONFIG.fruitSize}px`,
                      transform: 'translateZ(0)',
                      willChange: 'transform',
                      zIndex: 20
                    }}
                  >
                    <img src="/black_swan.png" alt="Black Swan" className="w-full h-full animate-bounce" />
                  </div>
                );
              }
              const FruitComponent = FRUIT_TYPES[fruit.type].icon;
              return (
                <div
                  key={fruit.id}
                  className="absolute"
                  style={{
                    left: `${fruit.x}px`,
                    top: `${fruit.y}px`,
                    width: `${GAME_CONFIG.fruitSize}px`,
                    height: `${GAME_CONFIG.fruitSize}px`,
                    transform: 'translateZ(0)',
                    willChange: 'transform'
                  }}
                >
                  <FruitComponent 
                    className={`w-full h-full ${FRUIT_TYPES[fruit.type].color} drop-shadow-lg animate-bounce`}
                  />
                </div>
              );
            })}

            {/* Player */}
            <div
              className="absolute bottom-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg"
              style={{
                left: `${playerX}px`,
                width: `${GAME_CONFIG.playerWidth}px`,
                height: `${GAME_CONFIG.playerHeight}px`,
                transform: 'translateZ(0)',
                willChange: 'transform'
              }}
            />

            {/* Game Over Overlay */}
            {!gameState.isPlaying && gameState.timeLeft === 0 && (
              <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm z-30">
                {blackSwanEnded ? (
                  <>
                    {/* 以 lost_pepe.png 作為全螢幕背景 */}
                    <img
                      src="/lost_pepe.png"
                      alt="Black Swan Ended"
                      className="absolute inset-0 w-full h-full object-cover z-0 select-none pointer-events-none"
                      style={{ filter: 'blur(0.5px) brightness(0.97)' }}
                    />
                    {/* 中央 overlay 只顯示標題與提示 */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                      <h2 className="text-4xl font-bold text-white drop-shadow-lg mb-4">Black Swan Event!</h2>
                      <p className="text-white/90 text-lg mb-4 bg-black/40 px-6 py-3 rounded-xl">You hit a Black Swan!<br/>Game Over Instantly.</p>
                    </div>
                    {/* Play Again 按鈕移至畫面最下方 */}
                    <div className="absolute bottom-0 left-0 w-full flex justify-center pb-12 z-20">
                      <button
                        onClick={() => {
                          setSelectedMood(null);
                          setMoodQuote(null);
                          setGameState(prev => ({
                            ...prev,
                            isPlaying: false,
                            isPaused: false,
                            score: 0,
                            timeLeft: GAME_CONFIG.gameDuration,
                            level: 1,
                            gameSpeed: GAME_CONFIG.initialSpeed,
                            maxFruits: 4
                          }));
                          setBlackSwanEnded(false);
                        }}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg"
                      >
                        Play Again
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center">
                      <h2 className="text-3xl font-bold text-gray-800 mb-4">Time's Up!</h2>
                      <p className="text-gray-600 mb-2">Final Score: <span className="font-bold text-blue-600">{gameState.score}</span></p>
                      <p className="text-gray-600 mb-2">Level Reached: <span className="font-bold text-green-600">{gameState.level}</span></p>
                      {gameState.score === gameState.highScore && gameState.score > 0 && (
                        <p className="text-yellow-600 font-bold mb-4">🎉 New High Score! 🎉</p>
                      )}
                      {/* 遊戲結束時僅顯示名言 */}
                      {selectedMood && moodQuote && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 rounded-xl shadow mb-2 animate-fade-in mt-4">
                          <span className="text-2xl mr-2">{MOODS.find(m => m.key === selectedMood)?.emoji}</span>
                          <span className="italic">{moodQuote}</span>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setSelectedMood(null);
                          setMoodQuote(null);
                          setGameState(prev => ({
                            ...prev,
                            isPlaying: false,
                            isPaused: false,
                            score: 0,
                            timeLeft: GAME_CONFIG.gameDuration,
                            level: 1,
                            gameSpeed: GAME_CONFIG.initialSpeed,
                            maxFruits: 4
                          }));
                        }}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 mt-4"
                      >
                        Play Again
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Pause Overlay */}
            {gameState.isPaused && gameState.isPlaying && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">Paused</h2>
                  <p className="text-gray-600 mb-6">Press Space or click Resume to continue</p>
                  <button
                    onClick={pauseGame}
                    className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Resume
                  </button>
                </div>
              </div>
            )}

            {/* Start Screen */}
            {!gameState.isPlaying && gameState.timeLeft > 0 && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/80 to-purple-600/80 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-2xl w-full mx-4">
                  <h2 className="text-3xl font-bold text-gray-800 mb-6">Ready for AirDrop?</h2>
                  {/* 分成左右兩區塊，桌面版左右、手機上下 */}
                  <div className="flex flex-col md:flex-row md:space-x-8 md:space-y-0 space-y-6 mb-6 w-full items-stretch justify-center">
                    {/* 左：說明區塊 */}
                    <div className="md:w-1/2 w-full flex flex-col justify-center">
                      <div className="bg-blue-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-center space-x-2 mb-3">
                          <Clock className="w-6 h-6 text-blue-600" />
                          <span className="text-xl font-bold text-blue-800">60 Second Challenge</span>
                        </div>
                        <p className="text-gray-600 text-sm">Catch as many coins as possible before time runs out!</p>
                      </div>
                      {/* 幣種分數說明 */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <SiBitcoin className="w-6 h-6 text-yellow-500" />
                            <span className="font-medium">Bitcoin (BTC)</span>
                          </div>
                          <span className="text-yellow-600 font-bold">{cryptoPrices.btc ? `${Math.round(cryptoPrices.btc)} pts` : 'Loading...'}</span>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <SiEthereum className="w-6 h-6 text-blue-500" />
                            <span className="font-medium">Ethereum (ETH)</span>
                          </div>
                          <span className="text-blue-600 font-bold">{cryptoPrices.eth ? `${Math.round(cryptoPrices.eth)} pts` : 'Loading...'}</span>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <SiBinance className="w-6 h-6 text-yellow-400" />
                            <span className="font-medium">Binance Coin (BNB)</span>
                          </div>
                          <span className="text-yellow-500 font-bold">{cryptoPrices.bnb ? `${Math.round(cryptoPrices.bnb)} pts` : 'Loading...'}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-6">
                        <p>Use <kbd className="bg-gray-200 px-2 py-1 rounded">←</kbd> <kbd className="bg-gray-200 px-2 py-1 rounded">→</kbd> or <kbd className="bg-gray-200 px-2 py-1 rounded">A</kbd> <kbd className="bg-gray-200 px-2 py-1 rounded">D</kbd> to move</p>
                        <p>Press <kbd className="bg-gray-200 px-2 py-1 rounded">Space</kbd> to pause</p>
                      </div>
                    </div>
                    {/* 右：心情選擇區塊 */}
                    <div className="md:w-1/2 w-full flex flex-col justify-center">
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">How do you feel today?</h3>
                      <div className="flex flex-wrap justify-center gap-3 mb-2">
                        {MOODS.map(mood => (
                          <button
                            key={mood.key}
                            onClick={() => handleMoodSelect(mood.key)}
                            className={`px-4 py-2 rounded-xl border-2 font-bold text-lg flex items-center gap-2 transition-all duration-150 shadow-sm hover:scale-110 ${selectedMood === mood.key ? 'bg-gradient-to-r from-blue-400 to-purple-400 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'}`}
                          >
                            <span className="text-2xl">{mood.emoji}</span> {mood.label}
                          </button>
                        ))}
                      </div>
                      {selectedMood && (
                        <div className="text-blue-700 font-semibold mt-1 flex items-center justify-center gap-2">
                          <span className="text-2xl">{MOODS.find(m => m.key === selectedMood)?.emoji}</span>
                          <span>{MOODS.find(m => m.key === selectedMood)?.label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Start/Connect Wallet 按鈕 */}
                  {walletAddress ? (
                    <button
                      onClick={startGame}
                      disabled={!selectedMood}
                      className={`bg-gradient-to-r from-green-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-green-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2 w-full ${!selectedMood ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Play className="w-5 h-5" />
                      <span>Start 60s Challenge</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectWallet}
                      disabled={walletConnecting}
                      className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-8 py-4 rounded-xl font-semibold shadow hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200 flex items-center justify-center space-x-2 w-full"
                    >
                      <span>{walletConnecting ? 'Connecting...' : 'Connect Wallet to Play'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4 mt-6">
          {gameState.isPlaying && (
            <button
              onClick={pauseGame}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm flex items-center space-x-2"
            >
              {gameState.isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              <span>{gameState.isPaused ? 'Resume' : 'Pause'}</span>
            </button>
          )}
          
          <button
            onClick={resetGame}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm flex items-center space-x-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Mobile Touch Controls */}
        <div className="md:hidden mt-6 flex justify-center space-x-4">
          <button
            onTouchStart={() => keysRef.current['ArrowLeft'] = true}
            onTouchEnd={() => keysRef.current['ArrowLeft'] = false}
            onMouseDown={() => keysRef.current['ArrowLeft'] = true}
            onMouseUp={() => keysRef.current['ArrowLeft'] = false}
            className="bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm select-none"
          >
            ←
          </button>
          <button
            onTouchStart={() => keysRef.current['ArrowRight'] = true}
            onTouchEnd={() => keysRef.current['ArrowRight'] = false}
            onMouseDown={() => keysRef.current['ArrowRight'] = true}
            onMouseUp={() => keysRef.current['ArrowRight'] = false}
            className="bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm select-none"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
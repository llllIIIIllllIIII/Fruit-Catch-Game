'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Apple, Zap, Banana, Clock, Play, Pause, RotateCcw, Trophy } from 'lucide-react';
import { SiBitcoin, SiEthereum, SiBinance } from 'react-icons/si';

interface Fruit {
  id: number;
  x: number;
  y: number;
  type: 'btc' | 'eth' | 'bnb';
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
  bnb: { icon: SiBinance, points: 20, color: 'text-yellow-400', bgColor: 'bg-yellow-400' }
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
  gameDuration: 60 // 60 seconds
};

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

  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isPaused: false,
    score: 0,
    highScore: 0,
    timeLeft: GAME_CONFIG.gameDuration,
    level: 1,
    gameSpeed: GAME_CONFIG.initialSpeed
  });

  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [playerX, setPlayerX] = useState(GAME_CONFIG.gameWidth / 2 - GAME_CONFIG.playerWidth / 2);

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

  const spawnFruit = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    const now = Date.now();
    const spawnDelay = 800 / gameState.gameSpeed; // Faster spawning for time-based game
    
    if (now - lastSpawnRef.current > spawnDelay && fruitsRef.current.length < GAME_CONFIG.maxFruits) {
      lastSpawnRef.current = now;
      
      const fruitTypes = Object.keys(FRUIT_TYPES) as Array<keyof typeof FRUIT_TYPES>;
      const randomType = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
      
      const newFruit: Fruit = {
        id: now + Math.random(),
        x: Math.random() * (GAME_CONFIG.gameWidth - GAME_CONFIG.fruitSize),
        y: -GAME_CONFIG.fruitSize,
        type: randomType,
        points: FRUIT_TYPES[randomType].points,
        speed: gameState.gameSpeed + Math.random() * 2
      };

      fruitsRef.current = [...fruitsRef.current, newFruit];
      setFruits([...fruitsRef.current]);
    }
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameSpeed]);

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
        scoreIncrease += fruit.points;
        fruitsToRemove.push(fruit.id);
      }
      // Remove fruits that hit the ground (no penalty in time-based mode)
      else if (fruit.y > GAME_CONFIG.gameHeight - GAME_CONFIG.fruitSize) {
        fruitsToRemove.push(fruit.id);
      }
    });

    if (fruitsToRemove.length > 0) {
      fruitsRef.current = fruitsRef.current.filter(fruit => !fruitsToRemove.includes(fruit.id));
      setFruits([...fruitsRef.current]);
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
          highScore: newHighScore,
          level: Math.floor(newScore / 150) + 1,
          gameSpeed: GAME_CONFIG.initialSpeed + Math.floor(newScore / 150) * 0.4
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
      gameSpeed: GAME_CONFIG.initialSpeed
    }));
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
      gameSpeed: GAME_CONFIG.initialSpeed
    }));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
            🍎 Fruit Rush 🍌
          </h1>
          <p className="text-white/80 text-lg">Catch as many fruits as possible in 60 seconds!</p>
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
          
          {/* Game Area */}
          <div ref={gameRef} className="relative w-full h-full">
            {/* Fruits */}
            {fruits.map(fruit => {
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
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-sm w-full mx-4">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">Time's Up!</h2>
                  <p className="text-gray-600 mb-2">Final Score: <span className="font-bold text-blue-600">{gameState.score}</span></p>
                  <p className="text-gray-600 mb-2">Level Reached: <span className="font-bold text-green-600">{gameState.level}</span></p>
                  {gameState.score === gameState.highScore && gameState.score > 0 && (
                    <p className="text-yellow-600 font-bold mb-4">🎉 New High Score! 🎉</p>
                  )}
                  <button
                    onClick={startGame}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Play Again
                  </button>
                </div>
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
                <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-md w-full mx-4">
                  <h2 className="text-3xl font-bold text-gray-800 mb-6">Ready for Fruit Rush?</h2>
                  
                  <div className="mb-6 bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-center space-x-2 mb-3">
                      <Clock className="w-6 h-6 text-blue-600" />
                      <span className="text-xl font-bold text-blue-800">60 Second Challenge</span>
                    </div>
                    <p className="text-gray-600 text-sm">Catch as many fruits as possible before time runs out!</p>
                  </div>
                  
                  <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <SiBitcoin className="w-6 h-6 text-yellow-500" />
                        <span className="font-medium">Bitcoin (BTC)</span>
                      </div>
                      <span className="text-yellow-600 font-bold">10 pts</span>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <SiEthereum className="w-6 h-6 text-blue-500" />
                        <span className="font-medium">Ethereum (ETH)</span>
                      </div>
                      <span className="text-blue-600 font-bold">15 pts</span>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <SiBinance className="w-6 h-6 text-yellow-400" />
                        <span className="font-medium">Binance Coin (BNB)</span>
                      </div>
                      <span className="text-yellow-500 font-bold">20 pts</span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-6">
                    <p>Use <kbd className="bg-gray-200 px-2 py-1 rounded">←</kbd> <kbd className="bg-gray-200 px-2 py-1 rounded">→</kbd> or <kbd className="bg-gray-200 px-2 py-1 rounded">A</kbd> <kbd className="bg-gray-200 px-2 py-1 rounded">D</kbd> to move</p>
                    <p>Press <kbd className="bg-gray-200 px-2 py-1 rounded">Space</kbd> to pause</p>
                  </div>

                  <button
                    onClick={startGame}
                    className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-green-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2 w-full"
                  >
                    <Play className="w-5 h-5" />
                    <span>Start 60s Challenge</span>
                  </button>
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
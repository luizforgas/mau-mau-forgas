import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import PlayerSetup from "@/components/PlayerSetup";
import GameBoard from "@/components/GameBoard";
import GameOver from "@/components/GameOver";
import { Card, Direction, GameState, Player, GameSettings } from "@/types/game";
import { 
  createDeck, 
  shuffleDeck, 
  dealCards, 
  isValidMove,
  getNextPlayerIndex,
  findWinner,
  handleSpecialCard,
  checkMauMauStatus,
  drawCardsFromDeck,
  calculateScores,
  getDefaultGameSettings
} from "@/utils/gameUtils";

// Import multiplayer components
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import PlayerLogin from "@/components/PlayerLogin";
import Lobby from "@/components/Lobby";
import WaitingRoom from "@/components/WaitingRoom";
import TurnTimer from "@/components/TurnTimer";
import Chat from "@/components/Chat";

// Define multiplayer game state
const Index = () => {
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    deck: [],
    discardPile: [],
    direction: "clockwise",
    gameStarted: false,
    gameEnded: false,
    winner: null,
    lastAction: "",
    settings: getDefaultGameSettings()
  });
  
  const { 
    isAuthenticated, 
    currentRoom
  } = useMultiplayer();
  
  // Timer state
  const [isTimerActive, setIsTimerActive] = useState(false);
  const turnDuration = 30; // seconds
  
  // Initialize the game with players
  const startGame = (players: { id: string, name: string }[], settings: GameSettings) => {
    // Create players with initial score from settings
    const initialPlayers: Player[] = players.map(player => ({
      ...player,
      cards: [],
      score: settings.initialScore,
      saidMauMau: false,
      isEliminated: false,
    }));
    
    // Create and shuffle the deck, including jokers if enabled
    let deck = createDeck(settings.enableJokers);
    deck = shuffleDeck(deck);
    
    // Deal cards to players
    const { updatedPlayers, updatedDeck } = dealCards(initialPlayers, deck);
    
    // Place the first card on the discard pile
    const firstCard = updatedDeck.pop()!;
    
    setGameState({
      players: updatedPlayers,
      currentPlayerIndex: 0,
      deck: updatedDeck,
      discardPile: [firstCard],
      direction: "clockwise",
      gameStarted: true,
      gameEnded: false,
      winner: null,
      lastAction: `The game has started! ${updatedPlayers[0].name} goes first.`,
      settings
    });
    
    // Start turn timer for first player
    setIsTimerActive(true);
  };
  
  // Handle playing a card from the player's hand
  const handlePlayCard = (cardToPlay: Card) => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    
    // Check if the move is valid (considering bluffing option)
    if (!isValidMove(cardToPlay, topCard, gameState.settings.enableBluffing)) {
      toast({
        title: "Invalid move",
        description: "This card cannot be played now.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if player forgot to say Mau Mau when having 1 card
    const mauMauCheck = checkMauMauStatus(
      currentPlayer, 
      currentPlayer.saidMauMau, 
      gameState.settings.enableMauMauRule
    );
    
    let updatedPlayers = [...gameState.players];
    let updatedDeck = [...gameState.deck];
    let updatedDiscardPile = [...gameState.discardPile];
    let lastAction = "";
    
    // Apply Mau Mau penalty if necessary and rule is enabled
    if (mauMauCheck.shouldPenalize && !gameState.settings.autoCheckMauMau) {
      // Player forgot to say Mau Mau, draw 2 penalty cards
      const { drawnCards, updatedDeck: newDeck } = 
        drawCardsFromDeck(updatedDeck, updatedDiscardPile, 2);
      
      updatedPlayers[gameState.currentPlayerIndex].cards.push(...drawnCards);
      updatedDeck = newDeck;
      lastAction = mauMauCheck.message;
      
      toast({
        title: "Forgot to say Mau Mau!",
        description: "+2 penalty cards.",
        variant: "destructive"
      });
    }
    
    // Remove the played card from player's hand
    updatedPlayers[gameState.currentPlayerIndex].cards = 
      updatedPlayers[gameState.currentPlayerIndex].cards.filter(card => card.id !== cardToPlay.id);
    
    // Add the played card to the discard pile
    updatedDiscardPile.push(cardToPlay);
    
    // Check if the player has won
    const winner = updatedPlayers[gameState.currentPlayerIndex].cards.length === 0 
      ? updatedPlayers[gameState.currentPlayerIndex].id
      : null;
    
    // Initialize the updated state
    let updatedState: GameState = {
      ...gameState,
      players: updatedPlayers,
      deck: updatedDeck,
      discardPile: updatedDiscardPile,
      winner,
      gameEnded: !!winner,
      lastAction: lastAction || `${currentPlayer.name} played ${cardToPlay.rank} of ${cardToPlay.suit}.`
    };
    
    // Reset timer
    setIsTimerActive(false);
    
    // If no winner yet, apply special card effects
    if (!winner) {
      // Handle special card effects
      updatedState = handleSpecialCard(cardToPlay, updatedState);
      
      // Reset "said Mau Mau" status for all players
      updatedState.players = updatedState.players.map(player => ({
        ...player,
        saidMauMau: false
      }));
      
      // Activate timer for next player
      setTimeout(() => {
        setIsTimerActive(true);
      }, 500);
    } else {
      // Calculate final scores if game ended
      updatedState.players = calculateScores(updatedState.players, winner);
      updatedState.lastAction = `${currentPlayer.name} won the round!`;
      
      toast({
        title: "Round Over!",
        description: `${currentPlayer.name} won!`,
      });
    }
    
    setGameState(updatedState);
  };
  
  // Handle drawing a card
  const handleDrawCard = () => {
    const { drawnCards, updatedDeck, updatedDiscardPile, reshuffled } = 
      drawCardsFromDeck(gameState.deck, gameState.discardPile, 1);
    
    if (drawnCards.length === 0) {
      toast({
        title: "No more cards",
        description: "All cards have been dealt.",
        variant: "destructive"
      });
      return;
    }
    
    // Add the drawn card to the player's hand
    const updatedPlayers = [...gameState.players];
    updatedPlayers[gameState.currentPlayerIndex].cards.push(...drawnCards);
    
    // Check if player can play the drawn card
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const drawnCard = drawnCards[0];
    const canPlayDrawnCard = isValidMove(drawnCard, topCard, gameState.settings.enableBluffing);
    
    // Only move to the next player if the player can't play the drawn card
    let nextPlayerIndex = gameState.currentPlayerIndex;
    let lastAction = `${gameState.players[gameState.currentPlayerIndex].name} drew a card.`;
    
    if (reshuffled) {
      lastAction += " The deck was reshuffled.";
    }
    
    // Reset timer
    setIsTimerActive(false);
    
    if (!canPlayDrawnCard) {
      nextPlayerIndex = getNextPlayerIndex(
        gameState.currentPlayerIndex,
        gameState.direction,
        gameState.players.length
      );
      
      // Reset "said Mau Mau" status for all players
      updatedPlayers.forEach(player => player.saidMauMau = false);
      
      // Activate timer for next player after a short delay
      setTimeout(() => {
        setIsTimerActive(true);
      }, 500);
    } else {
      toast({
        title: "You can play this card",
        description: "The drawn card can be played this round."
      });
      
      // Keep timer active for current player if they can play
      setTimeout(() => {
        setIsTimerActive(true);
      }, 500);
    }
    
    setGameState({
      ...gameState,
      players: updatedPlayers,
      deck: updatedDeck,
      discardPile: updatedDiscardPile,
      currentPlayerIndex: nextPlayerIndex,
      lastAction
    });
  };
  
  // Handle saying Mau Mau
  const handleSayMauMau = () => {
    const updatedPlayers = [...gameState.players];
    updatedPlayers[gameState.currentPlayerIndex].saidMauMau = true;
    
    // Play a sound when Mau Mau is said
    try {
      const mauMauSound = new Audio("/mau-mau-sound.mp3");
      mauMauSound.play().catch(e => console.log("Audio play prevented:", e));
    } catch (e) {
      console.log("Sound error:", e);
    }
    
    toast({
      title: "Mau Mau!",
      description: `${updatedPlayers[gameState.currentPlayerIndex].name} said Mau Mau!`,
      className: "bg-indigo-600/80"
    });
    
    setGameState({
      ...gameState,
      players: updatedPlayers,
      lastAction: `${updatedPlayers[gameState.currentPlayerIndex].name} said Mau Mau!`
    });
  };
  
  // Handle turn timeout
  const handleTurnTimeout = () => {
    toast({
      title: "Time's up!",
      description: `${gameState.players[gameState.currentPlayerIndex].name}'s turn has ended.`,
      variant: "destructive"
    });
    
    // Automatically draw a card when the timer expires
    handleDrawCard();
  };
  
  // Restart with same players
  const handleRestartGame = () => {
    // Keep the same players but reset cards and adjust scores
    const updatedPlayers: Player[] = gameState.players.map(player => ({
      ...player,
      cards: [],
      saidMauMau: false,
      isEliminated: player.score <= 0,
    }));
    
    // Filter out eliminated players
    const activePlayers = updatedPlayers.filter(player => !player.isEliminated);
    
    if (activePlayers.length < 2) {
      toast({
        title: "Game over!",
        description: "Not enough players to continue.",
      });
      return;
    }
    
    // Create and shuffle the deck, considering jokers setting
    let deck = createDeck(gameState.settings.enableJokers);
    deck = shuffleDeck(deck);
    
    // Deal cards to players
    const { updatedPlayers: playersWithCards, updatedDeck } = dealCards(activePlayers, deck);
    
    // Place the first card on the discard pile
    const firstCard = updatedDeck.pop()!;
    
    setGameState({
      players: playersWithCards,
      currentPlayerIndex: 0,
      deck: updatedDeck,
      discardPile: [firstCard],
      direction: "clockwise",
      gameStarted: true,
      gameEnded: false,
      winner: null,
      lastAction: "New round started!",
      settings: gameState.settings
    });
    
    // Start turn timer for first player
    setIsTimerActive(true);
  };
  
  // Start a completely new game
  const handleNewGame = () => {
    setGameState({
      players: [],
      currentPlayerIndex: 0,
      deck: [],
      discardPile: [],
      direction: "clockwise",
      gameStarted: false,
      gameEnded: false,
      winner: null,
      lastAction: "",
      settings: getDefaultGameSettings()
    });
  };
  
  // Load sound effects when game starts
  useEffect(() => {
    // Preload sounds
    const sounds = [
      new Audio("/card-sound.mp3"),
      new Audio("/mau-mau-sound.mp3")
    ];
    
    // Just reference them to trigger loading
    sounds.forEach(sound => {
      sound.volume = 0.5;
      sound.preload = "auto";
    });
  }, []);
  
  // Auto-check for Mau Mau status at the end of each turn
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameEnded || !gameState.settings.enableMauMauRule || !gameState.settings.autoCheckMauMau) {
      return;
    }
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.cards.length === 1 && !currentPlayer.saidMauMau) {
      // Automatically apply Mau Mau when auto-check is enabled
      handleSayMauMau();
    }
  }, [gameState.currentPlayerIndex, gameState.gameStarted, gameState.settings]);
  
  // Render the appropriate component based on authentication and game state
  const renderContent = () => {
    // If player isn't authenticated, show login
    if (!isAuthenticated) {
      return <PlayerLogin />;
    }
    
    // If game is over, show game over screen
    if (gameState.gameEnded && gameState.winner) {
      const winnerPlayer = gameState.players.find(player => player.id === gameState.winner)!;
      return (
        <GameOver 
          winner={winnerPlayer} 
          players={gameState.players}
          onRestartGame={handleRestartGame}
          onNewGame={handleNewGame}
        />
      );
    }
    
    // If player is authenticated but not in a room, show the lobby
    if (!currentRoom) {
      return <Lobby />;
    }
    
    // If player is in a room but the game hasn't started, show the waiting room
    if (currentRoom && !currentRoom.gameStarted && !gameState.gameStarted) {
      return <WaitingRoom />;
    }
    
    // If game has started, show game board
    if (gameState.gameStarted || (currentRoom && currentRoom.gameStarted)) {
      return (
        <div className="bg-black/30 p-4 rounded-lg border border-white/10 backdrop-blur-sm shadow-lg">
          <div className="mb-4">
            <TurnTimer 
              isActive={isTimerActive} 
              duration={turnDuration} 
              onTimeout={handleTurnTimeout} 
            />
          </div>
          
          <GameBoard
            gameState={gameState}
            onPlayCard={handlePlayCard}
            onDrawCard={handleDrawCard}
            onSayMauMau={handleSayMauMau}
          />
          
          <div className="mt-6 border-t border-white/10 pt-4">
            <h3 className="text-lg font-medium text-white mb-3">Game Chat</h3>
            <div className="h-64 bg-black/40 rounded-lg p-3">
              <Chat />
            </div>
          </div>
        </div>
      );
    }
    
    // If no other conditions match, show the player setup
    return <PlayerSetup onStartGame={startGame} />;
  };
  
  return (
    <div className="min-h-screen bg-gradient-game py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-white mb-8">Mau Mau</h1>
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;

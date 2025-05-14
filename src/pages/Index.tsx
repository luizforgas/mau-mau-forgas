
import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
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
      lastAction: `O jogo começou! ${updatedPlayers[0].name} começa.`,
      settings
    });
  };
  
  // Handle playing a card from the player's hand
  const handlePlayCard = (cardToPlay: Card) => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    
    // Check if the move is valid (considering bluffing option)
    if (!isValidMove(cardToPlay, topCard, gameState.settings.enableBluffing)) {
      toast({
        title: "Jogada inválida",
        description: "Esta carta não pode ser jogada agora.",
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
        title: "Esqueceu de dizer Mau Mau!",
        description: "+2 cartas de penalidade.",
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
      lastAction: lastAction || `${currentPlayer.name} jogou ${cardToPlay.rank} de ${cardToPlay.suit}.`
    };
    
    // If no winner yet, apply special card effects
    if (!winner) {
      // Handle special card effects (this now always advances to the next player)
      updatedState = handleSpecialCard(cardToPlay, updatedState);
      
      // Reset "said Mau Mau" status for all players
      updatedState.players = updatedState.players.map(player => ({
        ...player,
        saidMauMau: false
      }));
    } else {
      // Calculate final scores if game ended
      updatedState.players = calculateScores(updatedState.players, winner);
      updatedState.lastAction = `${currentPlayer.name} venceu a rodada!`;
      
      toast({
        title: "Fim da Rodada!",
        description: `${currentPlayer.name} venceu!`,
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
        title: "Não há mais cartas",
        description: "Todas as cartas já foram distribuídas.",
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
    let lastAction = `${gameState.players[gameState.currentPlayerIndex].name} comprou uma carta.`;
    
    if (reshuffled) {
      lastAction += " O monte foi reembaralhado.";
    }
    
    if (!canPlayDrawnCard) {
      nextPlayerIndex = getNextPlayerIndex(
        gameState.currentPlayerIndex,
        gameState.direction,
        gameState.players.length
      );
      
      // Reset "said Mau Mau" status for all players
      updatedPlayers.forEach(player => player.saidMauMau = false);
    } else {
      toast({
        title: "Você pode jogar esta carta",
        description: "A carta comprada pode ser jogada nesta rodada."
      });
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
      description: `${updatedPlayers[gameState.currentPlayerIndex].name} disse Mau Mau!`,
      className: "bg-indigo-600/80"
    });
    
    setGameState({
      ...gameState,
      players: updatedPlayers,
      lastAction: `${updatedPlayers[gameState.currentPlayerIndex].name} disse Mau Mau!`
    });
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
        title: "Fim do jogo!",
        description: "Não há jogadores suficientes para continuar.",
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
      lastAction: "Nova rodada iniciada!",
      settings: gameState.settings
    });
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
  
  // If the game is over and there's a winner, show game over screen
  if (gameState.gameEnded && gameState.winner) {
    const winnerPlayer = gameState.players.find(player => player.id === gameState.winner)!;
    return (
      <div className="min-h-screen bg-gradient-game py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <GameOver 
            winner={winnerPlayer} 
            players={gameState.players}
            onRestartGame={handleRestartGame}
            onNewGame={handleNewGame}
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-game py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-white mb-8">Mau Mau</h1>
        
        {!gameState.gameStarted ? (
          <PlayerSetup onStartGame={startGame} />
        ) : (
          <div className="bg-black/30 p-4 rounded-lg border border-white/10 backdrop-blur-sm shadow-lg">
            <GameBoard
              gameState={gameState}
              onPlayCard={handlePlayCard}
              onDrawCard={handleDrawCard}
              onSayMauMau={handleSayMauMau}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;

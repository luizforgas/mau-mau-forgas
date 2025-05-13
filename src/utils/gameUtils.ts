import { Card, Rank, Suit, Player, GameState, Direction } from "../types/game";

export const INITIAL_SCORE = 100;
export const INITIAL_CARDS = 7;

// Create a deck of cards (2 decks combined)
export const createDeck = (): Card[] => {
  const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
  const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  let deck: Card[] = [];
  
  // Create two standard decks
  for (let d = 0; d < 2; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        const isRed = suit === "hearts" || suit === "diamonds";
        deck.push({
          id: `${suit}-${rank}-${d}`,
          suit,
          rank,
          isRed
        });
      }
    }
  }
  
  return deck;
};

// Shuffle the deck
export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// Deal cards to players
export const dealCards = (
  players: Player[],
  deck: Card[],
): { updatedPlayers: Player[]; updatedDeck: Card[] } => {
  const updatedPlayers = [...players];
  let updatedDeck = [...deck];
  
  for (let i = 0; i < INITIAL_CARDS; i++) {
    for (let j = 0; j < updatedPlayers.length; j++) {
      if (updatedDeck.length > 0) {
        const card = updatedDeck.pop()!;
        updatedPlayers[j].cards.push(card);
      }
    }
  }
  
  return { updatedPlayers, updatedDeck };
};

// Check if a card can be played on top of discard pile
export const isValidMove = (cardToPlay: Card, topCard: Card): boolean => {
  return (
    cardToPlay.suit === topCard.suit || 
    cardToPlay.rank === topCard.rank
  );
};

// Get the next player's index
export const getNextPlayerIndex = (
  currentPlayerIndex: number,
  direction: Direction,
  playersCount: number,
): number => {
  if (direction === "clockwise") {
    return (currentPlayerIndex + 1) % playersCount;
  } else {
    return (currentPlayerIndex - 1 + playersCount) % playersCount;
  }
};

// Find a player with no cards (winner)
export const findWinner = (players: Player[]): string | null => {
  const winner = players.find(player => player.cards.length === 0);
  return winner ? winner.id : null;
};

// Calculate card points
export const getCardPoints = (card: Card): number => {
  if (card.rank === "A") {
    return 15;
  } else if (["K", "Q", "J"].includes(card.rank)) {
    return 10;
  } else {
    return parseInt(card.rank) || 0;
  }
};

// Calculate scores after a round
export const calculateScores = (
  players: Player[],
  winnerId: string,
): Player[] => {
  return players.map(player => {
    if (player.id === winnerId) {
      return player; // Winner doesn't lose points
    }
    
    // Calculate points from remaining cards
    const pointsToLose = player.cards.reduce(
      (total, card) => total + getCardPoints(card),
      0
    );
    
    return {
      ...player,
      score: player.score - pointsToLose,
      isEliminated: player.score - pointsToLose <= 0,
    };
  });
};

// Process special card effects
export const handleSpecialCard = (
  playedCard: Card,
  gameState: GameState,
): GameState => {
  let newState = { ...gameState };
  let message = "";
  
  switch (playedCard.rank) {
    case "A": // Skip next player
      const skippedPlayerIndex = getNextPlayerIndex(
        newState.currentPlayerIndex,
        newState.direction,
        newState.players.length
      );
      const skippedPlayerName = newState.players[skippedPlayerIndex].name;
      
      newState.currentPlayerIndex = getNextPlayerIndex(
        skippedPlayerIndex,
        newState.direction,
        newState.players.length
      );
      message = `${skippedPlayerName} foi pulado!`;
      break;
      
    case "Q": // Reverse direction
      newState.direction = newState.direction === "clockwise" ? "counterclockwise" : "clockwise";
      message = `Direção do jogo invertida!`;
      break;
      
    case "9": // Previous player draws a card
      const prevPlayerIndex = newState.direction === "clockwise" 
        ? (newState.currentPlayerIndex - 1 + newState.players.length) % newState.players.length
        : (newState.currentPlayerIndex + 1) % newState.players.length;
      
      const prevPlayer = newState.players[prevPlayerIndex];
      
      if (newState.deck.length > 0) {
        const drawnCard = newState.deck.pop()!;
        newState.players[prevPlayerIndex].cards.push(drawnCard);
        message = `${prevPlayer.name} comprou uma carta!`;
      } else if (newState.discardPile.length > 1) {
        // Reshuffle discard pile if deck is empty
        const topCard = newState.discardPile.pop()!;
        newState.deck = shuffleDeck(newState.discardPile);
        newState.discardPile = [topCard];
        
        const drawnCard = newState.deck.pop()!;
        newState.players[prevPlayerIndex].cards.push(drawnCard);
        message = `Baralho foi embaralhado novamente. ${prevPlayer.name} comprou uma carta!`;
      }
      break;
      
    default:
      // Move to next player for regular cards
      newState.currentPlayerIndex = getNextPlayerIndex(
        newState.currentPlayerIndex,
        newState.direction,
        newState.players.length
      );
      break;
  }
  
  newState.lastAction = message || newState.lastAction;
  return newState;
};

// Check if a player forgot to say Mau Mau
export const checkMauMauStatus = (
  player: Player,
  hasSaidMauMau: boolean
): { shouldPenalize: boolean, message: string } => {
  if (player.cards.length === 1 && !hasSaidMauMau) {
    return {
      shouldPenalize: true,
      message: `${player.name} esqueceu de dizer Mau Mau! +2 cartas de penalidade.`
    };
  }
  return {
    shouldPenalize: false,
    message: ""
  };
};

// Draw cards from deck with reshuffling if necessary
export const drawCardsFromDeck = (
  deck: Card[],
  discardPile: Card[],
  count: number
): { drawnCards: Card[], updatedDeck: Card[], updatedDiscardPile: Card[], reshuffled: boolean } => {
  let updatedDeck = [...deck];
  let updatedDiscardPile = [...discardPile];
  let drawnCards: Card[] = [];
  let reshuffled = false;
  
  for (let i = 0; i < count; i++) {
    if (updatedDeck.length === 0) {
      if (updatedDiscardPile.length <= 1) {
        break; // Cannot draw more cards
      }
      
      // Keep the top card and reshuffle the rest
      const topCard = updatedDiscardPile.pop()!;
      updatedDeck = shuffleDeck(updatedDiscardPile);
      updatedDiscardPile = [topCard];
      reshuffled = true;
    }
    
    if (updatedDeck.length > 0) {
      const card = updatedDeck.pop()!;
      drawnCards.push(card);
    }
  }
  
  return { drawnCards, updatedDeck, updatedDiscardPile, reshuffled };
};

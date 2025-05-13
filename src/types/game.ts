
export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  isRed: boolean;
}

export interface Player {
  id: string;
  name: string;
  cards: Card[];
  score: number;
  saidMauMau: boolean;
  isEliminated: boolean;
}

export type Direction = "clockwise" | "counterclockwise";

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  direction: Direction;
  gameStarted: boolean;
  gameEnded: boolean;
  winner: string | null;
  lastAction: string;
}

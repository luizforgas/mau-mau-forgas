
import React from "react";
import { Card as CardType } from "../types/game";
import { cn } from "../lib/utils";

interface PlayingCardProps {
  card?: CardType;
  isPlayable?: boolean;
  onClick?: () => void;
  isFaceDown?: boolean;
  className?: string;
}

const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  isPlayable = false,
  onClick,
  isFaceDown = false,
  className,
}) => {
  if (!card) {
    // Empty card slot
    return (
      <div
        className={cn(
          "w-16 h-24 border border-dashed border-gray-300 rounded-lg",
          className
        )}
      />
    );
  }
  
  const suitSymbols = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };
  
  const rankDisplay = (rank: string) => {
    switch(rank) {
      case 'A': return 'A';
      case 'K': return 'K';
      case 'Q': return 'Q';
      case 'J': return 'J';
      default: return rank;
    }
  };
  
  return (
    <div
      className={cn(
        "relative w-16 h-24 bg-white rounded-lg shadow-md transform transition-transform duration-200",
        isPlayable && !isFaceDown ? "hover:-translate-y-2 cursor-pointer" : "",
        isFaceDown ? "bg-blue-700" : "",
        className
      )}
      onClick={isPlayable && !isFaceDown ? onClick : undefined}
    >
      {!isFaceDown && (
        <>
          <div 
            className={cn(
              "absolute top-1 left-1 font-bold text-md",
              card.isRed ? "text-card-red" : "text-card-black"
            )}
          >
            {rankDisplay(card.rank)}
          </div>
          <div 
            className={cn(
              "absolute bottom-1 right-1 font-bold text-md rotate-180",
              card.isRed ? "text-card-red" : "text-card-black"
            )}
          >
            {rankDisplay(card.rank)}
          </div>
          <div 
            className={cn(
              "absolute inset-0 flex items-center justify-center text-2xl",
              card.isRed ? "text-card-red" : "text-card-black"
            )}
          >
            {suitSymbols[card.suit]}
          </div>
        </>
      )}
      {isFaceDown && (
        <div className="absolute inset-0 rounded-lg bg-blue-700 border-2 border-white flex items-center justify-center">
          <div className="w-8 h-12 rounded-full bg-blue-900 flex items-center justify-center">
            <span className="text-white font-bold">MᴀᴜMᴀᴜ</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayingCard;

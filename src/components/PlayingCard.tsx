
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
  if (!card && !isFaceDown) {
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
    joker: "★",
  };
  
  const rankDisplay = (rank: string) => {
    switch(rank) {
      case 'A': return 'A';
      case 'K': return 'K';
      case 'Q': return 'Q';
      case 'J': return 'J';
      case 'joker': return 'J';
      default: return rank;
    }
  };
  
  return (
    <div
      className={cn(
        "relative w-16 h-24 rounded-lg shadow-lg transform transition-all duration-200",
        isPlayable && !isFaceDown ? "hover:-translate-y-2 cursor-pointer" : "",
        isFaceDown ? "bg-indigo-700" : "bg-white",
        className
      )}
      onClick={isPlayable && !isFaceDown ? onClick : undefined}
    >
      {!isFaceDown && card && (
        <>
          {card.rank === "joker" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={cn(
                "text-3xl font-bold",
                card.isRed ? "text-card-red" : "text-card-black"
              )}>
                {suitSymbols.joker}
              </div>
              <div className={cn(
                "text-lg font-bold mt-1",
                card.isRed ? "text-card-red" : "text-card-black"
              )}>
                JOKER
              </div>
            </div>
          ) : (
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
        </>
      )}
      {isFaceDown && (
        <div className="absolute inset-0 rounded-lg bg-indigo-700 border border-indigo-300/30 flex items-center justify-center shadow-inner">
          <div className="w-8 h-12 rounded-full bg-indigo-900 flex items-center justify-center border border-indigo-500/30">
            <span className="text-white font-bold text-xs">MᴀᴜMᴀᴜ</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayingCard;

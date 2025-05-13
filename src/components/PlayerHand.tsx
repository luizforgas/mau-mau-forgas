
import React from "react";
import { Card as CardType } from "../types/game";
import PlayingCard from "./PlayingCard";
import { cn } from "../lib/utils";

interface PlayerHandProps {
  cards: CardType[];
  isCurrentPlayer: boolean;
  onCardClick?: (card: CardType) => void;
  playableCards?: CardType[];
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  isCurrentPlayer,
  onCardClick,
  playableCards = [],
}) => {
  // For non-current players, show cards face down and fewer details
  if (!isCurrentPlayer) {
    return (
      <div className="flex flex-wrap justify-center items-center gap-1 max-w-md mx-auto">
        {cards.map((_, index) => (
          <div key={index} className="relative h-6 w-4 hover-scale">
            <div className="absolute -left-1 top-0 bg-blue-700 h-6 w-4 border border-white rounded-sm" />
          </div>
        ))}
        <span className="text-white text-xs ml-2">{cards.length} cartas</span>
      </div>
    );
  }
  
  // Calculate overlap based on card count
  const getCardPosition = (index: number, total: number): number => {
    const maxWidth = Math.min(window.innerWidth - 40, 600); // Responsive max width
    const cardWidth = 16 * 4; // 16 tailwind units = 4rem = 64px typically
    
    if (total <= 7 || maxWidth >= total * cardWidth) {
      return 0; // No overlap needed
    }
    
    const availableWidth = maxWidth - cardWidth;
    const gapBetweenCards = availableWidth / (total - 1);
    return index * gapBetweenCards;
  };
  
  const isPlayableCard = (card: CardType): boolean => {
    return playableCards.some(playable => playable.id === card.id);
  };
  
  return (
    <div className="relative h-28 flex items-end justify-center mt-4">
      {cards.map((card, index) => {
        const left = getCardPosition(index, cards.length);
        return (
          <div
            key={card.id}
            className="absolute transition-all duration-300 animate-fade-in"
            style={{ left: `${left}px` }}
          >
            <PlayingCard
              card={card}
              isPlayable={isCurrentPlayer && isPlayableCard(card)}
              onClick={() => onCardClick && onCardClick(card)}
              className={cn(
                isPlayableCard(card) ? "ring-2 ring-gold" : "",
                "transition-transform duration-300"
              )}
            />
          </div>
        );
      })}
    </div>
  );
};

export default PlayerHand;

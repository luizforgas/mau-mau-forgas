import React, { useState } from "react";
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
  // State to track which card is being hovered
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

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
  
  // Calculate card positions with proper spacing for any number of cards
  const getCardPosition = (index: number, total: number): number => {
    const maxWidth = Math.min(window.innerWidth - 40, 600); // Responsive max width
    const cardWidth = 16 * 4; // 16 tailwind units = 4rem = 64px typically
    const cardOverlapRatio = 0.35; // How much cards overlap (smaller = more overlap)
    
    // Calculate overlap needed based on available space
    const availableWidth = maxWidth;
    const fullCardSpace = cardWidth * total;
    
    // If we have enough space, no need to overlap cards
    if (fullCardSpace <= availableWidth) {
      const spacing = (availableWidth - fullCardSpace) / Math.max(total - 1, 1);
      return index * (cardWidth + spacing);
    }
    
    // Otherwise, we need to overlap cards
    const overlapWidth = cardWidth * cardOverlapRatio;
    return index * overlapWidth;
  };
  
  const isPlayableCard = (card: CardType): boolean => {
    return playableCards.some(playable => playable.id === card.id);
  };
  
  return (
    <div className="relative h-32 flex items-end justify-center mt-4">
      {cards.map((card, index) => {
        const left = getCardPosition(index, cards.length);
        const isHovered = hoveredCardId === card.id;
        const canPlay = isCurrentPlayer && isPlayableCard(card);
        
        return (
          <div
            key={card.id}
            className={cn(
              "absolute transition-all duration-300 animate-fade-in",
              isHovered && "z-50" // Bring hovered card to front
            )}
            style={{ 
              left: `${left}px`, 
              zIndex: isHovered ? 50 : index, // Stack cards properly
              transform: isHovered ? "translateY(-12px)" : "none" 
            }}
            onMouseEnter={() => setHoveredCardId(card.id)}
            onMouseLeave={() => setHoveredCardId(null)}
          >
            <PlayingCard
              card={card}
              isPlayable={canPlay}
              onClick={() => onCardClick && onCardClick(card)}
              className={cn(
                isPlayableCard(card) ? "ring-2 ring-gold" : "",
                "transition-transform duration-300 cursor-pointer"
              )}
            />
          </div>
        );
      })}
    </div>
  );
};

export default PlayerHand;

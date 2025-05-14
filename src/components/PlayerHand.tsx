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

  // Calculate card positions with proper spacing for any number of cards
  const getCardPosition = (index: number, total: number): number => {
    // For current player, we want to space cards evenly without overlap
    if (isCurrentPlayer) {
      const containerWidth = Math.min(window.innerWidth - 40, 600); // Responsive max width
      const cardWidth = 16 * 4; // 16 tailwind units = 4rem = 64px typically
      
      // Calculate the total width needed for all cards with no overlap
      const totalCardWidth = cardWidth * total;
      
      // If we have enough space, distribute cards evenly
      if (totalCardWidth <= containerWidth) {
        return index * (cardWidth + 8); // 8px gap between cards
      }
      
      // Otherwise, calculate maximum spacing we can use
      const availableSpace = containerWidth - cardWidth; // Reserve space for one full card
      const spacing = availableSpace / Math.max(total - 1, 1);
      return index * spacing;
    } else {
      // For non-current players, we can allow more overlap since cards are face down
      const containerWidth = Math.min(240, window.innerWidth / 2); // Smaller container for other players
      const cardWidth = 10 * 4; // Smaller cards for opponents (40px)
      const totalWidth = Math.min(containerWidth, cards.length * 20);
      
      // Calculate spacing to fit within container
      const spacing = total <= 1 ? 0 : totalWidth / Math.max(total - 1, 1);
      return index * Math.min(spacing, cardWidth * 0.6); // Max overlap of 60%
    }
  };
  
  const isPlayableCard = (card: CardType): boolean => {
    return playableCards.some(playable => playable.id === card.id);
  };
  
  // For non-current players, show a more visually appealing display of face down cards
  if (!isCurrentPlayer) {
    return (
      <div className="relative h-16 flex items-center justify-center w-full">
        <div className="relative w-full h-14 flex items-center justify-center">
          {cards.map((card, index) => {
            const left = getCardPosition(index, cards.length);
            return (
              <div
                key={card.id}
                className="absolute transition-all duration-300"
                style={{ 
                  left: `${left}px`,
                  zIndex: index,
                }}
              >
                <PlayingCard 
                  isFaceDown={true} 
                  className="w-10 h-14 transform scale-75"
                />
              </div>
            );
          })}
        </div>
        <span className="absolute -bottom-4 text-white text-xs">
          {cards.length} cartas
        </span>
      </div>
    );
  }
  
  return (
    <div className="relative h-32 flex items-end justify-center mt-4 overflow-visible">
      <div className="relative w-full flex items-end justify-center">
        {cards.map((card, index) => {
          const left = getCardPosition(index, cards.length);
          const isHovered = hoveredCardId === card.id;
          const canPlay = isCurrentPlayer && isPlayableCard(card);
          
          return (
            <div
              key={card.id}
              className={cn(
                "absolute transition-all duration-300 custom-fade-in",
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
                onClick={() => canPlay && onCardClick && onCardClick(card)}
                className={cn(
                  isPlayableCard(card) ? "ring-2 ring-indigo-400" : "",
                  "transition-transform duration-300",
                  canPlay ? "cursor-pointer" : "cursor-default"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerHand;


import React, { useState, useEffect } from "react";
import { Card, Direction, GameState, Player } from "../types/game";
import PlayingCard from "./PlayingCard";
import PlayerHand from "./PlayerHand";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { isValidMove } from "@/utils/gameUtils";

interface GameBoardProps {
  gameState: GameState;
  onPlayCard: (card: Card) => void;
  onDrawCard: () => void;
  onSayMauMau: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onPlayCard,
  onDrawCard,
  onSayMauMau,
}) => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const topCard = gameState.discardPile.length > 0 ? gameState.discardPile[gameState.discardPile.length - 1] : null;
  
  // Sound effects
  const [cardSound] = useState(new Audio("/card-sound.mp3"));
  const playCardSound = () => {
    cardSound.currentTime = 0;
    cardSound.play().catch(e => console.log("Audio play prevented:", e));
  };
  
  // Calculate playable cards for the current player
  const playableCards = topCard ? currentPlayer.cards.filter(card => 
    isValidMove(card, topCard, gameState.settings.enableBluffing)) : [];
  
  // Highlight animation for current player
  const [highlight, setHighlight] = useState(false);
  
  useEffect(() => {
    // Trigger highlight animation when current player changes
    setHighlight(true);
    const timer = setTimeout(() => setHighlight(false), 1000);
    
    return () => clearTimeout(timer);
  }, [gameState.currentPlayerIndex]);
  
  const handlePlayCard = (card: Card) => {
    playCardSound();
    onPlayCard(card);
  };
  
  const handleDrawCard = () => {
    playCardSound();
    onDrawCard();
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {/* Players list */}
        <div className="bg-black/20 p-3 rounded-lg">
          <h3 className="text-white text-center mb-2 font-bold">Jogadores</h3>
          <div className="space-y-1">
            {gameState.players.map((player, index) => (
              <div 
                key={player.id} 
                className={`flex justify-between p-1 rounded transition-all duration-300 ${
                  index === gameState.currentPlayerIndex 
                    ? "bg-gold/20 border border-gold" + (highlight ? " animate-pulse" : "")
                    : ""
                }`}
              >
                <span className={`text-white ${player.isEliminated ? "line-through opacity-50" : ""}`}>
                  {player.name} {player.cards.length === 1 && player.saidMauMau && "🗣️"}
                </span>
                <span className={`text-white ${player.score <= 20 ? "text-red-400" : ""}`}>
                  {player.score} pts
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Game direction and last action */}
        <div className="col-span-1 sm:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <span className="text-white">Direção:</span>
            {gameState.direction === "clockwise" ? (
              <ArrowRight className="text-white animate-pulse" />
            ) : (
              <ArrowLeft className="text-white animate-pulse" />
            )}
          </div>
          
          {gameState.lastAction && (
            <div className="bg-black/30 p-2 rounded-lg animate-fade-in">
              <p className="text-white text-center">{gameState.lastAction}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Game board center - pile and discard */}
      <div className="flex-grow flex flex-col items-center justify-center">
        <div className="flex justify-center items-center gap-8">
          {/* Draw pile */}
          <div className="flex flex-col items-center">
            <div className="relative hover-scale">
              <PlayingCard isFaceDown={true} />
              <span className="absolute -top-3 -right-3 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {gameState.deck.length}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2 bg-black/30 text-white hover:bg-black/40 hover-scale"
              onClick={handleDrawCard}
              disabled={gameState.gameEnded}
            >
              Comprar
            </Button>
          </div>
          
          {/* Discard pile */}
          <div className="flex flex-col items-center">
            {topCard ? (
              <div className="hover-scale">
                <PlayingCard card={topCard} />
              </div>
            ) : (
              <div className="w-16 h-24 border-2 border-dashed border-white/30 rounded-lg" />
            )}
            <span className="text-white mt-2">Descarte</span>
          </div>
        </div>
      </div>
      
      {/* Current player's hand */}
      <div className="mt-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">{currentPlayer.name}</h3>
          {currentPlayer.cards.length === 1 && (
            <Button
              variant="default"
              className="bg-gold hover:bg-gold/80 text-black animate-pulse hover-scale"
              size="sm"
              onClick={onSayMauMau}
              disabled={currentPlayer.saidMauMau || gameState.gameEnded}
            >
              Dizer "Mau Mau"!
            </Button>
          )}
        </div>
        
        <PlayerHand
          cards={currentPlayer.cards}
          isCurrentPlayer={true}
          onCardClick={handlePlayCard}
          playableCards={playableCards}
        />
      </div>
      
      {/* Other players' hands (simplified) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-6">
        {gameState.players
          .filter((_, i) => i !== gameState.currentPlayerIndex && !gameState.players[i].isEliminated)
          .map((player) => (
            <div key={player.id} className="bg-black/20 p-2 rounded animate-fade-in">
              <h4 className="text-white text-sm mb-1">{player.name}</h4>
              <PlayerHand cards={player.cards} isCurrentPlayer={false} />
            </div>
          ))}
      </div>
    </div>
  );
};

export default GameBoard;

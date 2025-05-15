
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Player } from "@/types/game";
import translations from "@/localization/pt-BR";

interface GameOverProps {
  winner: Player;
  players: Player[];
  onRestartGame: () => void;
  onNewGame: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ winner, players, onRestartGame, onNewGame }) => {
  // Sort players by score (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  return (
    <Card className="w-full max-w-md mx-auto bg-black/20 p-6 rounded-lg border-2 border-table-border">
      <h2 className="text-2xl font-bold text-center text-gold mb-6">{translations.game.gameOver}</h2>
      
      <div className="text-center mb-8">
        <h3 className="text-xl text-white mb-2">🏆 {translations.game.winner}:</h3>
        <p className="text-2xl font-bold text-gold">{winner.name}</p>
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg text-white mb-3">{translations.game.finalRanking}</h3>
        
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => (
            <div 
              key={player.id} 
              className={`flex justify-between p-2 rounded ${
                player.id === winner.id 
                  ? "bg-gold/20 border border-gold" 
                  : "bg-white/10"
              }`}
            >
              <span className="text-white">
                {index + 1}. {player.name}
              </span>
              <span className="text-white font-bold">
                {player.score} pts
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex gap-4">
        <Button 
          className="flex-1 bg-table-border hover:bg-table-border/80 text-white"
          onClick={onRestartGame}
        >
          {translations.game.newRound}
        </Button>
        <Button 
          className="flex-1 bg-gold hover:bg-gold/80 text-black"
          onClick={onNewGame}
        >
          {translations.game.newGame}
        </Button>
      </div>
    </Card>
  );
};

export default GameOver;

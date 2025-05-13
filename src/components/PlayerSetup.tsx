
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GameSettings } from "@/types/game";
import { INITIAL_SCORE } from "@/utils/gameUtils";

interface PlayerSetupProps {
  onStartGame: (players: { id: string, name: string }[], settings: GameSettings) => void;
}

const PlayerSetup: React.FC<PlayerSetupProps> = ({ onStartGame }) => {
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(["Jogador 1", "Jogador 2"]);
  const [initialScore, setInitialScore] = useState(INITIAL_SCORE);
  const [enableJokers, setEnableJokers] = useState(false);
  const [enableBluffing, setEnableBluffing] = useState(false);
  
  const handlePlayerCountChange = (increment: boolean) => {
    const newCount = increment ? Math.min(playerCount + 1, 10) : Math.max(playerCount - 1, 2);
    setPlayerCount(newCount);
    
    // Update player names array
    if (increment && playerCount < 10) {
      setPlayerNames([...playerNames, `Jogador ${playerCount + 1}`]);
    } else if (!increment && playerCount > 2) {
      setPlayerNames(playerNames.slice(0, -1));
    }
  };
  
  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name || `Jogador ${index + 1}`;
    setPlayerNames(newNames);
  };
  
  const handleSubmit = () => {
    const players = playerNames.slice(0, playerCount).map((name, index) => ({
      id: `player-${index}`,
      name: name.trim() || `Jogador ${index + 1}`,
    }));
    
    const settings: GameSettings = {
      initialScore,
      enableJokers,
      enableBluffing
    };
    
    onStartGame(players, settings);
  };
  
  return (
    <Card className="w-full max-w-md mx-auto bg-black/20 p-6 rounded-lg border-2 border-table-border animate-fade-in">
      <h2 className="text-xl font-bold text-white text-center mb-6">Mau Mau - Configuração</h2>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="playerCount" className="block text-white mb-2">
            Número de Jogadores
          </label>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              className="text-white border-white"
              onClick={() => handlePlayerCountChange(false)}
              disabled={playerCount <= 2}
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <span className="px-4 py-2 bg-black/30 text-white rounded-md text-center w-12">
              {playerCount}
            </span>
            
            <Button
              size="sm"
              variant="outline"
              className="text-white border-white"
              onClick={() => handlePlayerCountChange(true)}
              disabled={playerCount >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div>
          <label htmlFor="initialScore" className="block text-white mb-2">
            Pontuação Inicial
          </label>
          <Input 
            id="initialScore"
            type="number"
            min="10"
            max="1000"
            value={initialScore}
            onChange={(e) => setInitialScore(Math.max(10, Math.min(1000, parseInt(e.target.value) || 100)))}
            className="bg-black/20 text-white border-white/30"
          />
        </div>
        
        <div className="space-y-3">
          <h3 className="text-white font-medium">Nomes dos Jogadores</h3>
          
          {playerNames.slice(0, playerCount).map((name, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-white w-12 text-right">#{index + 1}</span>
              <Input
                placeholder={`Jogador ${index + 1}`}
                value={name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                className="bg-black/20 text-white border-white/30"
              />
            </div>
          ))}
        </div>
        
        <div className="space-y-3 pt-2 border-t border-white/10">
          <h3 className="text-white font-medium">Regras Especiais</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="jokers" className="text-white">
              Habilitar Curingas
              <p className="text-xs text-white/70">Adiciona 4 curingas (+5 cartas, perde a vez)</p>
            </Label>
            <Switch 
              id="jokers"
              checked={enableJokers}
              onCheckedChange={setEnableJokers}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="bluffing" className="text-white">
              Habilitar Blefe
              <p className="text-xs text-white/70">Permite jogar qualquer carta (estratégia)</p>
            </Label>
            <Switch 
              id="bluffing"
              checked={enableBluffing}
              onCheckedChange={setEnableBluffing}
            />
          </div>
        </div>
        
        <Button 
          className="w-full bg-gold hover:bg-gold/80 text-black hover-scale" 
          onClick={handleSubmit}
        >
          Iniciar Jogo
        </Button>
      </div>
    </Card>
  );
};

export default PlayerSetup;

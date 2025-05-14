
import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';

interface TurnTimerProps {
  isActive: boolean;
  duration: number; // in seconds
  onTimeout: () => void;
}

const TurnTimer: React.FC<TurnTimerProps> = ({ isActive, duration, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [progress, setProgress] = useState(100);
  
  useEffect(() => {
    // Reset timer when it becomes active
    if (isActive) {
      setTimeLeft(duration);
      setProgress(100);
    }
  }, [isActive, duration]);
  
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (isActive && timeLeft > 0) {
      timer = setTimeout(() => {
        const newTimeLeft = timeLeft - 0.1;
        setTimeLeft(newTimeLeft);
        setProgress((newTimeLeft / duration) * 100);
      }, 100);
    } else if (isActive && timeLeft <= 0) {
      onTimeout();
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isActive, timeLeft, duration, onTimeout]);
  
  const getColorClass = () => {
    if (timeLeft > duration * 0.5) return 'bg-green-600';
    if (timeLeft > duration * 0.25) return 'bg-yellow-500';
    return 'bg-red-600';
  };
  
  if (!isActive) return null;
  
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-white">Your turn</span>
        <span className={`font-mono ${timeLeft < 5 ? 'text-red-400' : 'text-gray-300'}`}>
          {Math.ceil(timeLeft)}s
        </span>
      </div>
      <Progress 
        value={progress} 
        className="h-2 bg-gray-800" 
        indicatorClassName={getColorClass()} 
      />
    </div>
  );
};

export default TurnTimer;

import React, { useState, useEffect } from 'react';
import { Timer as TimerType } from '../types';
import { Clock, Pause, Play, RotateCcw } from 'lucide-react';

interface TimerProps {
  duration: number;
  onComplete: () => void;
}

export default function Timer({ duration, onComplete }: TimerProps) {
  const [timer, setTimer] = useState<TimerType>({
    minutes: duration,
    seconds: 0,
    isRunning: false,
    delay: 0
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timer.isRunning) {
      interval = setInterval(() => {
        if (timer.minutes === 0 && timer.seconds === 0) {
          setTimer(prev => ({ ...prev, isRunning: false }));
          onComplete();
          return;
        }

        setTimer(prev => {
          if (prev.seconds === 0) {
            return {
              ...prev,
              minutes: prev.minutes - 1,
              seconds: 59
            };
          }
          return {
            ...prev,
            seconds: prev.seconds - 1
          };
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.minutes, timer.seconds, onComplete]);

  const toggleTimer = () => {
    setTimer(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const resetTimer = () => {
    setTimer({
      minutes: duration,
      seconds: 0,
      isRunning: false,
      delay: 0
    });
  };

  const formatTime = (minutes: number, seconds: number) => {
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-8xl font-bold font-mono tracking-wider">
        {formatTime(timer.minutes, timer.seconds)}
      </div>
      <div className="flex space-x-4">
        <button
          onClick={toggleTimer}
          className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          {timer.isRunning ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button
          onClick={resetTimer}
          className="p-2 rounded-full bg-gray-500 text-white hover:bg-gray-600 transition-colors"
        >
          <RotateCcw size={24} />
        </button>
      </div>
      <div className="flex items-center space-x-2 text-gray-600">
        <Clock size={20} />
        <span>Duration: {duration} minutes</span>
      </div>
    </div>
  );
}
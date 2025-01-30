import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { parseTime } from '../utils/timeUtils';

interface CountdownToSpeakerProps {
  startTime: string;
  speakerName: string;
}

const CountdownToSpeaker: React.FC<CountdownToSpeakerProps> = ({ startTime, speakerName }) => {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentSeconds = now.getSeconds();
      
      const { hours: startHours, minutes: startMinutes } = parseTime(startTime);
      
      const totalSecondsLeft = 
        (startHours * 3600 + startMinutes * 60) - 
        (currentHours * 3600 + currentMinutes * 60 + currentSeconds);

      if (totalSecondsLeft <= 0) {
        return { minutes: 0, seconds: 0 };
      }

      return {
        minutes: Math.floor(totalSecondsLeft / 60),
        seconds: totalSecondsLeft % 60
      };
    };

    const updateTimer = () => {
      setTimeLeft(calculateTimeLeft());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  if (!timeLeft) return null;

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 text-center">
      <h2 className="text-4xl font-bold text-blue-300 mb-4">
        {speakerName} מתחיל בקרוב
      </h2>
      <div className="flex items-center justify-center gap-4">
        <Clock size={32} className="text-blue-400" />
        <div className="font-mono text-6xl text-white">
          {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
};

export default CountdownToSpeaker; 
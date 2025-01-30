import React from 'react';
import { Speaker } from '../types';
import { Clock } from 'lucide-react';
import { addMinutesToTime } from '../utils/timeUtils';

interface TimelineProps {
  speakers: Speaker[];
  startTime: string;
  currentSpeakerId: string | null;
}

const Timeline: React.FC<TimelineProps> = ({ speakers, startTime, currentSpeakerId }) => {
  const totalDuration = speakers.reduce((sum, speaker) => sum + speaker.duration, 0);
  
  const calculatePosition = (index: number): number => {
    const previousDuration = speakers
      .slice(0, index)
      .reduce((sum, speaker) => sum + speaker.duration, 0);
    return (previousDuration / totalDuration) * 100;
  };

  return (
    <div className="relative h-24 bg-black/20 rounded-xl overflow-hidden">
      {/* Timeline base */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
      
      {/* Time markers */}
      <div className="absolute top-0 left-0 right-0 h-6 flex items-center text-xs text-gray-400">
        {speakers.map((speaker, index) => {
          let currentTime = startTime;
          for (let i = 0; i < index; i++) {
            currentTime = addMinutesToTime(currentTime, speakers[i].duration);
          }
          const position = calculatePosition(index);
          
          return (
            <div
              key={speaker.id}
              className="absolute flex items-center"
              style={{ left: `${position}%` }}
            >
              <span className="ml-1">{currentTime}</span>
            </div>
          );
        })}
      </div>

      {/* Speaker blocks */}
      <div className="absolute bottom-0 left-0 right-0 h-16">
        {speakers.map((speaker, index) => {
          const position = calculatePosition(index);
          const width = (speaker.duration / totalDuration) * 100;
          
          return (
            <div
              key={speaker.id}
              className={`absolute h-full transition-all duration-300 ${
                currentSpeakerId === speaker.id
                  ? 'bg-green-500/30 border-green-400'
                  : speaker.isBreak
                  ? 'bg-purple-500/30 border-purple-400'
                  : 'bg-blue-500/30 border-blue-400'
              } border rounded-lg`}
              style={{
                left: `${position}%`,
                width: `${width}%`
              }}
            >
              <div className="p-2 text-xs">
                <div className="font-semibold truncate">{speaker.name || 'הפסקה'}</div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{speaker.duration}m</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline; 
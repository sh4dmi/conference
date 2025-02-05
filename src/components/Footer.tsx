import React from 'react';
import { ArrowLeft, ArrowRight, Timer } from 'lucide-react';

interface FooterProps {
  timeLeft: number;
  onPrevSpeaker: () => void;
  onPrevSpeakerNoTimeChange: () => void;
  onNextSpeaker: () => void;
  onNextSpeakerNoTimeChange: () => void;
  totalDuration: number;
  currentProgress: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  onAddMinute?: () => void;
}

export default function Footer({
  timeLeft,
  onPrevSpeaker,
  onPrevSpeakerNoTimeChange,
  onNextSpeaker,
  onNextSpeakerNoTimeChange,
  totalDuration,
  currentProgress,
  canGoNext,
  canGoPrev,
  onAddMinute
}: FooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-black/60 backdrop-blur-lg border-t border-white/10">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700/30">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
          style={{ width: `${currentProgress}%` }}
        />
      </div>

      <div className="container mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left section: Navigation controls */}
          <div className="flex items-center">
            {/* Navigation buttons group */}
            <div className="flex items-center bg-white/5 rounded-xl p-1">
              <button
                onClick={onPrevSpeaker}
                disabled={!canGoPrev}
                className={`
                  flex items-center space-x-2 px-5 py-3 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${canGoPrev
                    ? 'bg-white/10 hover:bg-white/20 text-white hover:scale-105'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <ArrowRight size={18} />
                <span>מציג קודם</span>
              </button>
              
              <div className="w-px h-8 bg-white/10 mx-1" />
              
              <button
                onClick={onNextSpeaker}
                disabled={!canGoNext}
                className={`
                  flex items-center space-x-2 px-5 py-3 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${canGoNext
                    ? 'bg-white/10 hover:bg-white/20 text-white hover:scale-105'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <span>מציג הבא</span>
                <ArrowLeft size={18} />
              </button>

              <div className="w-px h-8 bg-white/10 mx-1" />

              <button
                onClick={onNextSpeakerNoTimeChange}
                disabled={!canGoNext}
                className={`
                  flex items-center space-x-2 px-5 py-3 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${canGoNext
                    ? 'bg-white/10 hover:bg-white/20 text-white hover:scale-105'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <span>מציג הבא (ללא שינוי זמן)</span>
                <ArrowLeft size={18} />
              </button>
            </div>

            {/* Add minute button */}
            {onAddMinute && (
              <button
                onClick={onAddMinute}
                className="ml-4 px-5 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm font-medium transition-colors border border-blue-500/30"
              >
                +1 דקה
              </button>
            )}
          </div>

          {/* Center section: Time remaining */}
          <div className="flex items-center mx-4">
            <div className="flex items-center gap-2 bg-white/5 px-5 py-3 rounded-lg whitespace-nowrap">
              <Timer size={20} className="text-blue-400" />
              <span className="text-lg font-medium text-gray-300 ml-1">
                נותרו {timeLeft} דקות עד סוף הכנס
              </span>
            </div>
          </div>

          {/* Right section: Copyright */}
          <div className="flex items-center">
            <p className="text-3xl font-bold text-white whitespace-nowrap">
              כל הזכויות שמורות לענף תקשוב ודיגיטל אכ"א
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Conference, Speaker } from '../types';
import { Calendar, Clock, Settings } from 'lucide-react';
import { getCurrentSpeakerInfo, addMinutesToTime, getTimeRange } from '../utils/timeUtils';

interface SpeakerInfo {
  speaker?: Speaker;
  timeLeft: number;
  isWarning: boolean;
  currentIndex: number;
  timeRange?: string;
  isUpcoming?: boolean;
  isFinished?: boolean;
}

interface DisplayViewProps {
  isPreview?: boolean;
}

function DisplayView({ isPreview = false }: DisplayViewProps) {
  const [conference, setConference] = useState<Conference>(() => {
    const saved = localStorage.getItem('conference');
    return saved ? JSON.parse(saved) : {
      id: '1',
      name: 'כנס טבת התשפ"ה',
      date: '2025-01-20',
      speakers: [],
      currentSpeakerId: null,
      theme: {
        background: 'bg-gradient-to-r from-blue-900 to-blue-700',
        font: 'font-sans',
        backgroundImage: 'https://images.unsplash.com/photo-1557683311-eac922347aa1?auto=format&fit=crop&q=80'
      }
    };
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [speakerInfo, setSpeakerInfo] = useState<SpeakerInfo | null>(null);

  const scaleClass = isPreview ? 'scale-[0.25] origin-top-left' : '';

  // Combined effect for time updates and conference polling
  useEffect(() => {
    const updateTimeAndConference = () => {
      // Update time
      const now = new Date();
      setCurrentTime(now);
      
      // Update speaker info
      const info = getCurrentSpeakerInfo(conference.speakers, conference.startTime);
      setSpeakerInfo(info);
      
      if (info?.speaker && info.speaker.id !== conference.currentSpeakerId) {
        setConference(prev => ({
          ...prev,
          currentSpeakerId: info.speaker.id || null
        }));
      }

      // Check for conference updates
      const saved = localStorage.getItem('conference');
      if (saved) {
        const newConference = JSON.parse(saved);
        setConference(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(newConference)) {
            return newConference;
          }
          return prev;
        });
      }
    };

    // Initial update
    updateTimeAndConference();

    // Set up interval
    const timer = setInterval(updateTimeAndConference, 1000);

    return () => clearInterval(timer);
  }, [conference.speakers, conference.startTime]);

  // Calculate all upcoming speakers (excluding current)
  const upcomingSpeakers = conference.speakers
    .filter(speaker => speaker.id !== speakerInfo?.speaker?.id) // Exclude current speaker by ID
    .filter((_, index) => index > (speakerInfo?.currentIndex ?? -1))
    .slice(0, 8) // Show only next 8 speakers
    .sort((a, b) => a.order - b.order);

  // Calculate time ranges for all speakers
  const speakersWithTimes = upcomingSpeakers.map((speaker, index) => {
    let startTime = conference.startTime;
    // Find the actual index in the full speakers array
    const actualIndex = conference.speakers.findIndex(s => s.id === speaker.id);
    // Calculate the correct start time based on all previous speakers
    for (let i = 0; i < actualIndex; i++) {
      startTime = addMinutesToTime(startTime, conference.speakers[i].duration);
    }
    return {
      ...speaker,
      timeRange: getTimeRange(startTime, speaker.duration)
    };
  });

  // Get current speaker with time range
  const currentSpeaker = speakerInfo?.speaker ? {
    ...speakerInfo.speaker,
    timeRange: speakerInfo.timeRange
  } : null;

  // Calculate dynamic sizes based on number of speakers
  const speakerListHeight = Math.min(90, Math.max(50, 100 - (speakersWithTimes.length * 5)));
  
  return (
    <div 
      className={`min-h-screen text-white relative ${scaleClass}`}
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${conference.theme.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        ...(isPreview ? { 
          width: '400%',
          height: '400%',
          transformOrigin: 'top left'
        } : {})
      }}
    >
      {/* Fixed Logos */}
      <div className="fixed top-8 left-8 flex items-center space-x-8 z-50">
        <img 
          src="/logos/aka.png" 
          alt="AKA Logo" 
          className="h-48 w-48 object-contain bg-white/10 backdrop-blur-sm rounded-lg p-4"
        />
        <img 
          src="/logos/IDF.png" 
          alt="IDF Logo" 
          className="h-48 w-48 object-contain bg-white/10 backdrop-blur-sm rounded-lg p-4"
        />
      </div>

      {/* Admin Link */}
      <Link 
        to="/admin" 
        className="fixed bottom-4 left-4 p-2 bg-black/30 hover:bg-black/50 rounded-full transition-colors z-50"
        title="Admin Panel"
      >
        <Settings size={24} />
      </Link>

      <div className="container mx-auto px-4 py-8">
        {/* Clock and Date Section - Top Right */}
        <div className="fixed top-8 right-8 text-right z-40 bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="text-8xl font-bold font-mono tracking-wider mb-2">
            {currentTime.toLocaleTimeString('he-IL', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
          <div className="text-2xl font-medium flex items-center justify-end text-blue-200">
            <Calendar className="ml-2" size={24} />
            <span>{new Date(conference.date).toLocaleDateString('he-IL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
        </div>

        {/* Next Speakers - Right Side Timeline */}
        <div className="fixed top-80 right-8 w-96 z-40">
          <h2 className="text-3xl font-semibold mb-4 text-blue-300 flex items-center">
            <Clock className="ml-2" size={24} />
            מציגים הבאים
          </h2>
          <div 
            className="space-y-2 overflow-y-auto pr-1 pl-4" 
            style={{ 
              maxHeight: `calc(${speakerListHeight}vh)`,
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.3) transparent'
            }}
          >
            {/* Timeline Line */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500/30" />
            
            {speakersWithTimes.map((speaker, index) => (
              <div 
                key={speaker.id}
                className="relative"
              >
                {/* Timeline Dot */}
                <div className="absolute -left-[1.25rem] top-1/2 w-2 h-2 rounded-full bg-blue-400 transform -translate-y-1/2" />
                
                <div className={`p-3 rounded-xl transition-all duration-500 ${
                  speaker.isBreak 
                    ? 'bg-green-600/20 border border-green-500/50' 
                    : 'bg-white/5 hover:bg-white/10 border border-white/10'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {speaker.logo && (
                        <img 
                          src={`/logos/${speaker.logo}`}
                          alt={`${speaker.name} logo`}
                          className="w-10 h-10 object-contain rounded-full bg-white/10 p-1"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold truncate">{speaker.name}</h3>
                        <p className="text-sm text-gray-300 truncate">{speaker.topic}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono text-blue-200">{speaker.timeRange}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {conference.speakers.length > (speakerInfo?.currentIndex ?? -1) + 9 && (
              <div className="text-center text-sm text-gray-400 mt-2">
                ועוד {conference.speakers.length - ((speakerInfo?.currentIndex ?? -1) + 9)} מציגים נוספים...
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col items-center pt-8">
          {/* Conference Name */}
          <h1 className="text-7xl font-bold mb-16 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
            {conference.name}
          </h1>

          {/* Current Speaker - Large Card */}
          {currentSpeaker && (
            <div className="w-[80%] max-w-6xl">
              <h2 className="text-5xl font-semibold mb-6 text-blue-300 flex items-center">
                <div className="w-5 h-5 rounded-full bg-green-500 animate-pulse mr-3" />
                {speakerInfo?.isUpcoming ? 'המציג הבא' : speakerInfo?.isFinished ? 'הכנס הסתיים' : 'מציג נוכחי'}
              </h2>
              <div 
                className={`p-14 rounded-2xl transition-all duration-500 backdrop-blur-sm ${
                  speakerInfo?.isWarning
                    ? 'bg-red-900/20 border-2 border-red-500 animate-pulse'
                    : currentSpeaker.isBreak 
                      ? 'bg-green-900/20 border border-green-500'
                      : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex items-center gap-10">
                  {currentSpeaker.logo && (
                    <img 
                      src={`/logos/${currentSpeaker.logo}`}
                      alt={`${currentSpeaker.name} logo`}
                      className="w-52 h-52 object-contain rounded-2xl bg-white/10 p-4"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="text-8xl font-bold mb-6">{currentSpeaker.name}</h2>
                    <p className="text-5xl text-gray-300 mb-8">{currentSpeaker.topic}</p>
                    <div className="flex items-center gap-8">
                      <span className="text-4xl font-mono text-blue-200">{currentSpeaker.timeRange}</span>
                      {speakerInfo?.timeLeft && !speakerInfo.isFinished && (
                        <div className="flex-1">
                          <p className={`text-2xl mb-2 ${speakerInfo.isWarning ? 'text-red-400' : 'text-gray-300'}`}>
                            {speakerInfo.isUpcoming ? 'מתחיל בעוד' : ''} {speakerInfo.timeLeft} דקות {speakerInfo.isUpcoming ? '' : 'נותרו'}
                          </p>
                          {/* Progress Bar */}
                          <div className="w-full h-3 bg-black/30 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-1000"
                              style={{ 
                                width: `${((currentSpeaker.duration - speakerInfo.timeLeft) / currentSpeaker.duration) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ticker Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm border-t border-white/10 p-3 text-center">
          <p className="text-lg text-blue-200">
            {speakerInfo?.isUpcoming 
              ? `הכנס יתחיל בעוד ${speakerInfo.timeLeft} דקות` 
              : speakerInfo?.isFinished 
                ? 'תודה שהשתתפתם בכנס'
                : `נותרו ${speakerInfo?.timeLeft} דקות להרצאה הנוכחית`
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default DisplayView;
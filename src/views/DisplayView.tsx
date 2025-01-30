import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Conference, Speaker, Timer } from '../types';
import { SpeakerInfo, TimeRange } from '../types/SpeakerInfo';
import { Calendar, Clock, Settings } from 'lucide-react';
import { 
  getCurrentSpeakerInfo, 
  addMinutesToTime, 
  getTimeRange, 
  getTimeStatus,
  calculateTimeLeft,
  calculateSpeakerTimes,
  parseTime,
  SpeakerTime
} from '../utils/timeUtils';

interface DisplayViewProps {
  isPreview?: boolean;
}

function DisplayView({ isPreview = false }: DisplayViewProps) {
  const [conference, setConference] = useState<Conference | null>(() => {
    const saved = localStorage.getItem('conference');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      return parsed;
    } catch (error) {
      console.error('Error parsing conference data:', error);
      return null;
    }
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [speakerTimes, setSpeakerTimes] = useState<SpeakerTime[]>([]);
  const [timer, setTimer] = useState<Timer>({
    minutes: 0,
    seconds: 0,
    isRunning: false,
    delay: 1000
  });

  const scaleClass = isPreview ? 'scale-[0.25] origin-top-left' : '';

  // Update conference data when it changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('conference');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConference(parsed);
        } catch (error) {
          console.error('Error parsing conference data:', error);
        }
      }
    };

    // Listen for storage events from other tabs
    window.addEventListener('storage', handleStorageChange);
    
    // Check for updates every second
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Separate clock update from other updates
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 100); // Update clock more frequently for smoother display
    return () => clearInterval(clockInterval);
  }, []);

  // Keep the existing effect for speaker times, but remove the clock update
  useEffect(() => {
    if (conference?.speakers && conference.startTime) {
      const interval = setInterval(() => {
        const times = calculateSpeakerTimes(conference.speakers, conference.startTime);
        setSpeakerTimes(times);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [conference?.speakers, conference?.startTime]);

  const getTimeLeftForSpeaker = useCallback((speaker: Speaker): number => {
    if (!conference?.startTime) return 0;
    
    // Find speaker's time info
    const speakerTime = speakerTimes.find(st => st.id === speaker.id);
    if (!speakerTime) return 0;

    // Create TimeRange object for the utility function
    const timeRange: TimeRange = {
      startTime: speakerTime.startTime,
      endTime: speakerTime.endTime,
      duration: speaker.duration
    };

    return calculateTimeLeft(timeRange);
  }, [conference?.startTime, speakerTimes]);

  // Calculate speaker info with improved utilities
  const getSpeakerInfo = useCallback((speaker: Speaker): SpeakerInfo => {
    if (!conference?.startTime || !speakerTimes.length) {
      return {
        speaker,
        timeRange: '',
        timeLeft: 0,
        isWarning: false,
        isUpcoming: false,
        isFinished: true,
        currentIndex: -1,
        timeRangeObj: { 
          startTime: '', 
          endTime: '', 
          duration: speaker.duration
        }
      };
    }

    const speakerTime = speakerTimes.find(st => st.id === speaker.id);
    if (!speakerTime) {
      return {
        speaker,
        timeRange: '',
        timeLeft: 0,
        isWarning: false,
        isUpcoming: false,
        isFinished: true,
        currentIndex: -1,
        timeRangeObj: { 
          startTime: '', 
          endTime: '', 
          duration: speaker.duration
        }
      };
    }

    const timeRangeObj: TimeRange = {
      startTime: speakerTime.startTime,
      endTime: speakerTime.endTime,
      duration: speaker.duration
    };

    const status = getTimeStatus(timeRangeObj);
    const timeLeftMs = getTimeLeftForSpeaker(speaker);
    const isWarning = status === 'current' && timeLeftMs <= (conference.warningTime || 120) * 1000;

    return {
      speaker,
      timeRange: `${timeRangeObj.startTime}-${timeRangeObj.endTime}`,
      timeLeft: Math.floor(timeLeftMs / 60000),
      isWarning,
      isUpcoming: status === 'upcoming',
      isFinished: status === 'finished',
      currentIndex: conference.speakers.findIndex(s => s.id === speaker.id),
      timeRangeObj
    };
  }, [currentTime, conference, speakerTimes, getTimeLeftForSpeaker]);

  // Update timer for current speaker
  useEffect(() => {
    if (!conference?.currentSpeakerId) return;
    
    const currentSpeaker = conference.speakers.find(s => s.id === conference.currentSpeakerId);
    if (!currentSpeaker) return;
    
    const timeLeft = getTimeLeftForSpeaker(currentSpeaker);
    if (timeLeft <= 0) {
      setTimer(prev => ({ ...prev, isRunning: false }));
      return;
    }

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    setTimer(prev => ({
      ...prev,
      minutes,
      seconds,
      isRunning: true
    }));
  }, [currentTime, getTimeLeftForSpeaker, conference]);

  // Update the displayedSpeakers logic to properly handle showUpcomingOnly
  const displayedSpeakers = React.useMemo(() => {
    if (!conference?.speakers) return [];
    
    const speakerInfos = conference.speakers
      .map(speaker => getSpeakerInfo(speaker))
      .sort((a, b) => {
        // Always sort by order first (this maintains the original sequence)
        if (a.speaker?.order !== undefined && b.speaker?.order !== undefined) {
          return a.speaker.order - b.speaker.order;
        }
        return 0;
      });

    // Find current speaker
    const currentSpeaker = speakerInfos.find(info => 
      !info.isFinished && !info.isUpcoming
    );

    // In upcoming mode, show current speaker first + upcoming speakers
    if (conference.showUpcomingOnly) {
      const upcomingSpeakers = speakerInfos.filter(info => info.isUpcoming);
      return currentSpeaker ? [currentSpeaker, ...upcomingSpeakers] : upcomingSpeakers;
    }

    // In all mode, maintain original order
    return speakerInfos;
  }, [conference?.speakers, conference?.showUpcomingOnly, getSpeakerInfo]);

  // Function to check if conference has ended
  const hasConferenceEnded = React.useMemo(() => {
    if (!conference?.speakers?.length) return false;
    
    // Conference has ended only if all speakers are finished
    return conference.speakers.every(speaker => {
      const speakerTime = speakerTimes.find(st => st.id === speaker.id);
      if (!speakerTime) return false;
      
      const timeRangeObj: TimeRange = {
        startTime: speakerTime.startTime,
        endTime: speakerTime.endTime,
        duration: speaker.duration
      };
      
      return getTimeStatus(timeRangeObj) === 'finished';
    });
  }, [conference?.speakers, speakerTimes]);

  // Update the progress calculation to be based on speaker order
  const conferenceProgress = React.useMemo(() => {
    if (!conference?.speakers?.length || !speakerTimes.length) return 0;
    
    const totalDuration = conference.speakers.reduce((acc, s) => acc + s.duration, 0);
    
    // Find the current speaker's index
    const currentSpeakerIndex = conference.speakers.findIndex(s => {
      const speakerTime = speakerTimes.find(st => st.id === s.id);
      if (!speakerTime) return false;
      
      const timeRangeObj: TimeRange = {
        startTime: speakerTime.startTime,
        endTime: speakerTime.endTime,
        duration: speakerTime.duration
      };
      
      return getTimeStatus(timeRangeObj) === 'current';
    });

    if (currentSpeakerIndex === -1) return 0;
    
    // Calculate progress based on completed speakers plus current speaker progress
    const completedDuration = conference.speakers
      .slice(0, currentSpeakerIndex)
      .reduce((acc, s) => acc + s.duration, 0);
      
    const currentSpeaker = conference.speakers[currentSpeakerIndex];
    const currentSpeakerTime = speakerTimes.find(st => st.id === currentSpeaker.id);
    
    if (!currentSpeakerTime) return (completedDuration / totalDuration) * 100;
    
    const timeLeft = getTimeLeftForSpeaker(currentSpeaker);
    const currentProgress = currentSpeaker.duration - (timeLeft / 60000);
    
    const progress = ((completedDuration + currentProgress) / totalDuration) * 100;
    
    return Math.min(100, Math.max(0, progress));
  }, [conference?.speakers, currentTime, speakerTimes, getTimeLeftForSpeaker]);

  if (!conference) {
    if (isPreview) return null;
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">אין נתוני כנס</h1>
          <p className="text-xl text-gray-400 mb-8">נא להגדיר את פרטי הכנס בפאנל הניהול</p>
          <Link 
            to="/admin" 
            className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Settings className="mr-2" size={20} />
            <span>פאנל ניהול</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-white relative ${scaleClass}`}
      style={{
        backgroundImage: `
          linear-gradient(
            rgba(0, 0, 0, 0.8),
            rgba(0, 0, 0, 0.85)
          ),
          url(${conference.theme.backgroundImage})
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        ...(isPreview ? { width: '400%', height: '400%', transformOrigin: 'top left' } : {})
      }}>
      {/* Fixed Logos - Enhanced with shadows */}
      <div className="fixed top-24 left-8 flex items-center space-x-8 z-50">
        <img src="/logos/aka.png" alt="AKA Logo" 
          className="h-48 w-48 object-contain bg-white/10 backdrop-blur-sm rounded-lg p-4 shadow-lg shadow-black/50 border border-white/10 transition-all duration-300 hover:border-white/20" />
        <img src="/logos/IDF.png" alt="IDF Logo" 
          className="h-48 w-48 object-contain bg-white/10 backdrop-blur-sm rounded-lg p-4 shadow-lg shadow-black/50 border border-white/10 transition-all duration-300 hover:border-white/20" />
      </div>

      {/* Admin Link */}
      <Link to="/admin" 
        className="fixed bottom-4 left-4 p-2 bg-black/30 hover:bg-black/50 rounded-full transition-colors z-50"
        title="Admin Panel">
        <Settings size={24} />
      </Link>

      <div className="container mx-auto px-4 py-8 pl-12">
        {/* Clock and Date Section - Top Right */}
        <div className="fixed top-8 right-8 flex flex-col gap-4 z-40">
          {/* Clock Display */}
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-8xl font-bold font-mono tracking-wider">
              {currentTime.toLocaleTimeString('he-IL', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
          </div>

          {/* Date Display - One Line */}
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/10">
            <div className="flex items-center justify-end gap-4 text-2xl">
              <div className="flex items-center gap-3 text-blue-200">
                <Calendar size={24} className="text-blue-300" />
                <span>{currentTime.getFullYear()}</span>
                <span>ב{currentTime.toLocaleDateString('he-IL', { month: 'long' })}</span>
                <span className="font-bold">{currentTime.getDate()}</span>
                <span className="font-medium">יום {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][currentTime.getDay()]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Speakers List */}
        <div className="fixed top-80 right-8 w-96 z-40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold text-white flex items-center">
              <Clock className="ml-2" size={24} />
              {conference.showUpcomingOnly ? 'מציגים הבאים' : 'כל המציגים'}
            </h2>
          </div>
          <div className="space-y-3 overflow-y-auto pr-1 pl-4 relative max-h-[50vh]"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.3) transparent'
            }}>
            {/* Timeline with gradient - Only show when not in upcoming mode */}
            {!conference.showUpcomingOnly && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-700/30 rounded-full overflow-hidden">
                <div 
                  className="w-full bg-gradient-to-b from-blue-400 to-blue-600 transition-all duration-1000 rounded-full"
                  style={{ 
                    height: `${conferenceProgress}%`,
                    maxHeight: '100%'
                  }} 
                />
              </div>
            )}
            
            {/* Updated speaker cards with better contrast and glow effect for current speaker */}
            {displayedSpeakers.map((speakerInfo: SpeakerInfo) => {
              if (!speakerInfo.speaker) return null;
              const isCurrent = !speakerInfo.isFinished && !speakerInfo.isUpcoming;
              return (
                <div
                  key={speakerInfo.speaker.id}
                  className={`relative bg-white/10 backdrop-blur-sm rounded-xl p-4 transition-all duration-500 ${
                    isCurrent
                      ? 'ring-2 ring-blue-400 bg-blue-900/20 shadow-[0_0_30px_rgba(59,130,246,0.5)] animate-pulse-slow border border-blue-400/50'
                      : 'hover:bg-white/20'
                  }`}
                >
                  <div className={`space-y-2 ${isCurrent ? 'relative z-10' : ''}`}>
                    <div className="flex items-center gap-3">
                      {speakerInfo.speaker.logo && (
                        <img src={`/logos/${speakerInfo.speaker.logo}`}
                          alt={`${speakerInfo.speaker.name} logo`}
                          className={`w-12 h-12 object-contain rounded-full bg-white/20 p-1 ${
                            isCurrent ? 'ring-1 ring-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''
                          }`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-bold truncate ${
                          isCurrent ? 'text-blue-100 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'text-white'
                        }`}>{speakerInfo.speaker.name}</h3>
                        {speakerInfo.speaker.bio && (
                          <p className="text-sm text-gray-200 truncate italic">{speakerInfo.speaker.bio}</p>
                        )}
                        <p className={`text-sm truncate ${
                          isCurrent ? 'text-blue-300' : 'text-blue-200'
                        }`}>{speakerInfo.speaker.topic}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-mono font-semibold ${
                        isCurrent ? 'text-blue-100' : 'text-blue-100'
                      }`}>{speakerInfo.timeRange}</span>
                    </div>
                  </div>
                  {isCurrent && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-400/10 rounded-xl" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content - Moved down */}
        <div className="flex flex-col items-center pt-32">
          <h1 className="text-7xl font-bold mb-16 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
            {conference.name}
          </h1>

          {/* Current Speaker Card - Enhanced typography and spacing */}
          {displayedSpeakers.length > 0 && (
            <div className="w-[80%] max-w-6xl">
              <h2 className="text-5xl font-bold mb-8 text-white flex items-center tracking-wide">
                <div className="w-5 h-5 rounded-full bg-green-400 animate-pulse mr-3" />
                {hasConferenceEnded 
                  ? 'הכנס הסתיים'
                  : (() => {
                    const currentSpeaker = displayedSpeakers.find(s => !s.isFinished && !s.isUpcoming);
                    if (currentSpeaker) return 'מציג נוכחי';
                    const nextSpeaker = displayedSpeakers.find(s => s.isUpcoming);
                    if (nextSpeaker) return 'המציג הבא';
                    return 'הכנס הסתיים';
                  })()
                }
              </h2>
              {(() => {
                const currentSpeaker = displayedSpeakers.find(s => !s.isFinished && !s.isUpcoming);
                const nextSpeaker = displayedSpeakers.find(s => s.isUpcoming);
                const speakerToShow = currentSpeaker || nextSpeaker || displayedSpeakers[displayedSpeakers.length - 1];
                
                if (!speakerToShow?.speaker) return null;
                
                return (
                  <div className={`p-16 rounded-2xl transition-all duration-500 backdrop-blur-sm shadow-2xl ${
                    speakerToShow.isWarning
                      ? 'bg-red-900/30 border-2 border-red-400 animate-pulse'
                      : speakerToShow.speaker.isBreak 
                        ? 'bg-green-900/30 border border-green-400'
                        : 'bg-white/10 border border-white/20'
                  }`}>
                    <div className="flex items-center gap-12">
                      {speakerToShow.speaker.logo && (
                        <img src={`/logos/${speakerToShow.speaker.logo}`}
                          alt={`${speakerToShow.speaker.name} logo`}
                          className="w-52 h-52 object-contain rounded-2xl bg-white/10 p-4 shadow-lg shadow-black/50 border border-white/10" />
                      )}
                      <div className="flex-1">
                        <h2 className="text-8xl font-bold mb-8 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 drop-shadow-lg">
                          {speakerToShow.speaker.name}
                        </h2>
                        {speakerToShow.speaker.bio && (
                          <p className="text-3xl text-gray-300 mb-8 leading-relaxed font-light">
                            {speakerToShow.speaker.bio}
                          </p>
                        )}
                        <p className="text-5xl text-blue-200 mb-10 font-medium tracking-wide">
                          {speakerToShow.speaker.topic}
                        </p>
                        <div className="flex items-center gap-8">
                          <span className="text-4xl font-mono text-blue-100 font-semibold tracking-wider">
                            {speakerToShow.timeRange}
                          </span>
                          {speakerToShow.timeLeft && !speakerToShow.isFinished && (
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-3">
                                <p className={`text-2xl tracking-wide ${
                                  speakerToShow.isWarning ? 'text-red-400 font-semibold' : 'text-gray-300'
                                }`}>
                                  {speakerToShow.timeLeft !== undefined
                                    ? speakerToShow.isUpcoming 
                                      ? `מתחיל בעוד ${speakerToShow.timeLeft} דקות`
                                      : `נותרו ${speakerToShow.timeLeft} דקות`
                                    : ''
                                  }
                                </p>
                                {!speakerToShow.isUpcoming && (
                                  <p className="text-2xl text-blue-300">
                                    {Math.floor((speakerToShow.speaker.duration - speakerToShow.timeLeft) / 1)} דקות חלפו
                                  </p>
                                )}
                              </div>
                              <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000"
                                  style={{ 
                                    width: `${((speakerToShow.speaker.duration - speakerToShow.timeLeft) / speakerToShow.speaker.duration) * 100}%`
                                  }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Ticker Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm border-t border-white/10 p-3 text-center">
        <p className="text-lg text-blue-200">
          {displayedSpeakers.length > 0 && displayedSpeakers[0].timeLeft !== undefined
            ? hasConferenceEnded
              ? 'תודה שהשתתפתם בכנס'
              : displayedSpeakers[0].isUpcoming 
                ? `הכנס יתחיל בעוד ${displayedSpeakers[0].timeLeft} דקות` 
                : `נותרו ${displayedSpeakers[0].timeLeft} דקות להרצאה הנוכחית`
            : ''
          }
        </p>
      </div>

      {/* Disclaimer */}
      <div className="fixed bottom-4 right-4 text-sm text-white/50">
        כל הזכויות שמורות לענף תקשוב ודיגיטל אכ"א
      </div>
    </div>
  );
}

export default DisplayView;
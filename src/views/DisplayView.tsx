import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Conference, Speaker, Timer } from '../types';
import { SpeakerInfo, TimeRange } from '../types/SpeakerInfo';
import { Calendar, Clock, Settings, ArrowLeft } from 'lucide-react';
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
import Footer from '../components/Footer';

interface DisplayViewProps {
  isPreview?: boolean;
}

// Function to manually proceed to the next speaker without rearranging times
export const handleManualNextSpeakerNoTimeChange = (conference: Conference | null, setConference: React.Dispatch<React.SetStateAction<Conference | null>>) => {
  console.log("handleManualNextSpeakerNoTimeChange CALLED, mode:", conference?.mode);
  if (!conference || conference.mode !== 'manual') {
    console.log("handleManualNextSpeakerNoTimeChange - Not in manual mode or conference is null, returning");
    return;
  }

  const currentSpeakerIndex = conference.speakers.findIndex(s => s.id === conference.currentSpeakerId);
  const nextSpeakerIndex = currentSpeakerIndex + 1;
  console.log("handleManualNextSpeakerNoTimeChange - Current index:", currentSpeakerIndex, "Next index:", nextSpeakerIndex);

  if (nextSpeakerIndex < conference.speakers.length) {
    console.log("handleManualNextSpeakerNoTimeChange - Advancing to next speaker");
    const updatedConference = {
      ...conference,
      currentSpeakerId: conference.speakers[nextSpeakerIndex].id
    };
    setConference(updatedConference);
    localStorage.setItem('conference', JSON.stringify(updatedConference));
    window.dispatchEvent(new Event('storage'));
  } else {
    console.log("handleManualNextSpeakerNoTimeChange - No more speakers, ending conference");
    const updatedConference = {
      ...conference,
      currentSpeakerId: null
    };
    setConference(updatedConference);
    localStorage.setItem('conference', JSON.stringify(updatedConference));
    window.dispatchEvent(new Event('storage'));
  }
};

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
        timeLeftSeconds: 0,
        elapsedTime: 0,
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
        timeLeftSeconds: 0,
        elapsedTime: 0,
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

    // In manual mode, a speaker is only considered finished if they're before the current speaker
    const status = conference.mode === 'manual' 
      ? (() => {
          const currentIndex = conference.speakers.findIndex(s => s.id === conference.currentSpeakerId);
          const thisIndex = conference.speakers.findIndex(s => s.id === speaker.id);
          if (currentIndex === -1) return 'upcoming';
          if (thisIndex < currentIndex) return 'finished';
          if (thisIndex === currentIndex) return 'current';
          return 'upcoming';
        })()
      : getTimeStatus(timeRangeObj);

    const timeLeftMs = getTimeLeftForSpeaker(speaker);
    const timeLeft = Math.floor(timeLeftMs / 60000);
    const timeLeftSeconds = Math.floor(timeLeftMs / 1000);
    const isWarning = status === 'current' && timeLeftMs <= (conference.warningTime || 120) * 1000;

    // Calculate elapsed time based on start time and current time
    const startTimeDate = parseTime(speakerTime.startTime);
    const now = new Date();
    const elapsedTimeMs = now.getTime() - startTimeDate.getTime();
    const elapsedTime = Math.max(0, Math.ceil(elapsedTimeMs / (1000 * 60)));

    return {
      speaker,
      timeRange: `${timeRangeObj.startTime}-${timeRangeObj.endTime}`,
      timeLeft,
      timeLeftSeconds,
      elapsedTime,
      isWarning,
      isUpcoming: status === 'upcoming',
      isFinished: status === 'finished',
      currentIndex: conference.speakers.findIndex(s => s.id === speaker.id),
      timeRangeObj
    };
  }, [currentTime, conference, speakerTimes, getTimeLeftForSpeaker]);

  // Function to handle automatic progression to the next speaker
  const handleAutomaticNextSpeaker = useCallback(() => {
    console.log("handleAutomaticNextSpeaker CALLED, mode:", conference?.mode);
    if (!conference || conference.mode !== 'automatic') {
      console.log("handleAutomaticNextSpeaker - Not in automatic mode, returning");
      return;
    }

    const currentSpeakerIndex = conference.speakers.findIndex(s => s.id === conference.currentSpeakerId);
    const nextSpeakerIndex = currentSpeakerIndex + 1;
    console.log("handleAutomaticNextSpeaker - Current index:", currentSpeakerIndex, "Next index:", nextSpeakerIndex);

    if (nextSpeakerIndex < conference.speakers.length) {
      const updatedConference = {
        ...conference,
        currentSpeakerId: conference.speakers[nextSpeakerIndex].id
      };
      console.log("handleAutomaticNextSpeaker - Advancing to next speaker:", updatedConference.currentSpeakerId);
      setConference(updatedConference);
      localStorage.setItem('conference', JSON.stringify(updatedConference));
      window.dispatchEvent(new Event('storage'));
    } else {
      console.log("handleAutomaticNextSpeaker - No more speakers, ending conference");
      const updatedConference = {
        ...conference,
        currentSpeakerId: null
      };
      setConference(updatedConference);
      localStorage.setItem('conference', JSON.stringify(updatedConference));
      window.dispatchEvent(new Event('storage'));
    }
  }, [conference]);

  // Function to manually proceed to the next speaker
  const handleManualNextSpeaker = useCallback(() => {
    console.log("handleManualNextSpeaker CALLED, mode:", conference?.mode);
    if (!conference || conference.mode !== 'manual') {
      console.log("handleManualNextSpeaker - Not in manual mode, returning");
      return;
    }

    // If no current speaker is set, set it to the first speaker
    if (!conference.currentSpeakerId && conference.speakers.length > 0) {
      console.log("handleManualNextSpeaker - No current speaker, setting to first speaker");
      const updatedConference = {
        ...conference,
        currentSpeakerId: conference.speakers[0].id
      };
      setConference(updatedConference);
      localStorage.setItem('conference', JSON.stringify(updatedConference));
      window.dispatchEvent(new Event('storage'));
      return;
    }

    const currentSpeakerIndex = conference.speakers.findIndex(s => s.id === conference.currentSpeakerId);
    const currentSpeaker = conference.speakers[currentSpeakerIndex];
    const nextSpeakerIndex = currentSpeakerIndex + 1;
    console.log("handleManualNextSpeaker - Current index:", currentSpeakerIndex, "Next index:", nextSpeakerIndex);

    // Get current time rounded down to the nearest minute
    const now = new Date();
    now.setSeconds(0, 0); // Round down to nearest minute
    const currentTimeStr = now.toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    // Calculate elapsed time for current speaker
    const speakerStartTime = speakerTimes.find(st => st.id === currentSpeaker.id)?.startTime;
    if (speakerStartTime) {
      const startTimeDate = parseTime(speakerStartTime);
      const elapsedTimeMinutes = Math.ceil((now.getTime() - startTimeDate.getTime()) / (1000 * 60));
      console.log("handleManualNextSpeaker - Adjusting duration from", currentSpeaker.duration, "to", elapsedTimeMinutes);

      // Update all speakers' times based on the current transition
      const updatedSpeakers = conference.speakers.map((s, index) => {
        if (index < currentSpeakerIndex) {
          // Previous speakers remain unchanged
          return s;
        } else if (index === currentSpeakerIndex) {
          // Current speaker: update duration to elapsed time
          return { ...s, duration: elapsedTimeMinutes };
        } else if (index === nextSpeakerIndex) {
          // Next speaker: will start now
          return { ...s, startTime: currentTimeStr };
        } else {
          // Future speakers: will be recalculated based on the new times
          return s;
        }
      });

      if (nextSpeakerIndex < conference.speakers.length) {
        console.log("handleManualNextSpeaker - Advancing to next speaker");
        const updatedConference = {
          ...conference,
          speakers: updatedSpeakers,
          currentSpeakerId: conference.speakers[nextSpeakerIndex].id
        };
        setConference(updatedConference);
        localStorage.setItem('conference', JSON.stringify(updatedConference));
        window.dispatchEvent(new Event('storage'));

        // Immediately recalculate speaker times
        const newTimes = calculateSpeakerTimes(updatedSpeakers, conference.startTime);
        setSpeakerTimes(newTimes);
      } else {
        console.log("handleManualNextSpeaker - No more speakers, ending conference");
        const updatedConference = {
          ...conference,
          speakers: updatedSpeakers,
          currentSpeakerId: null
        };
        setConference(updatedConference);
        localStorage.setItem('conference', JSON.stringify(updatedConference));
        window.dispatchEvent(new Event('storage'));
      }
    }
  }, [conference, speakerTimes]);

  // Function to manually proceed to the previous speaker
  const handlePreviousSpeaker = useCallback(() => {
    console.log("handlePreviousSpeaker CALLED, mode:", conference?.mode);
    if (!conference || conference.mode !== 'manual') {
      console.log("handlePreviousSpeaker - Not in manual mode, returning");
      return;
    }

    const currentSpeakerIndex = conference.speakers.findIndex(s => s.id === conference.currentSpeakerId);
    const previousSpeakerIndex = currentSpeakerIndex - 1;
    console.log("handlePreviousSpeaker - Current index:", currentSpeakerIndex, "Previous index:", previousSpeakerIndex);

    if (previousSpeakerIndex >= 0) {
      console.log("handlePreviousSpeaker - Going back to previous speaker");
      const updatedConference = {
        ...conference,
        currentSpeakerId: conference.speakers[previousSpeakerIndex].id
      };
      setConference(updatedConference);
      localStorage.setItem('conference', JSON.stringify(updatedConference));
      window.dispatchEvent(new Event('storage'));
    } else {
      console.log("handlePreviousSpeaker - Already at first speaker");
    }
  }, [conference]);

  // Add this function before the keyboard shortcuts effect
  const handleAddMinute = useCallback(() => {
    if (!conference?.currentSpeakerId) return;
    
    // Get the current speaker
    const currentSpeaker = conference.speakers.find(s => s.id === conference.currentSpeakerId);
    if (!currentSpeaker) return;

    // Update the speakers array with the new duration
    const updatedSpeakers = conference.speakers.map(speaker => {
      if (speaker.id === conference.currentSpeakerId) {
        return { ...speaker, duration: speaker.duration + 1 };
      }
      return speaker;
    });

    // Update the conference with new speakers array
    const updatedConference = {
      ...conference,
      speakers: updatedSpeakers
    };

    // Update state and localStorage
    setConference(updatedConference);
    localStorage.setItem('conference', JSON.stringify(updatedConference));
    window.dispatchEvent(new Event('storage'));

    // Immediately recalculate speaker times
    const newTimes = calculateSpeakerTimes(updatedSpeakers, conference.startTime);
    setSpeakerTimes(newTimes);
  }, [conference]);

  // Keyboard shortcuts for manual mode (next and previous)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey) {
        if (event.key.toLowerCase() === 'p') {
          console.log("Next speaker keyboard shortcut TRIGGERED");
          event.preventDefault();
          if (conference?.mode === 'manual') {
            handleManualNextSpeaker();
          } else {
            handleAutomaticNextSpeaker();
          }
        } else if (event.key.toLowerCase() === 'b') {
          console.log("Previous speaker keyboard shortcut TRIGGERED");
          event.preventDefault();
          if (conference?.mode === 'manual') {
            handlePreviousSpeaker();
          }
        } else if (event.key.toLowerCase() === 'l') {
          console.log("Add minute keyboard shortcut TRIGGERED");
          event.preventDefault();
          if (conference?.currentSpeakerId) {
            handleAddMinute();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conference?.mode, handleManualNextSpeaker, handlePreviousSpeaker, handleAddMinute, conference?.currentSpeakerId, handleAutomaticNextSpeaker]);

  // Update timer for current speaker
  useEffect(() => {
    console.log("Timer useEffect RUNNING, mode:", conference?.mode);
    if (!conference?.currentSpeakerId) return;
    
    const currentSpeaker = conference.speakers.find(s => s.id === conference.currentSpeakerId);
    if (!currentSpeaker) return;
      
    const timeLeft = getTimeLeftForSpeaker(currentSpeaker);
    console.log("Timer useEffect - Time left:", timeLeft, "ms");
      
    if (timeLeft <= 0) {
      setTimer(prev => ({ ...prev, isRunning: false }));
      // Only switch to next speaker automatically if in automatic mode
      if (conference.mode === 'automatic') {
        console.log("Timer useEffect - Time up, triggering automatic next speaker");
        handleAutomaticNextSpeaker();
      } else {
        console.log("Timer useEffect - Time up, but in manual mode, not advancing");
        }
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
  }, [currentTime, getTimeLeftForSpeaker, conference, handleAutomaticNextSpeaker]);

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
    
  // Add this function at the top with other utility functions
  const getTotalRemainingConferenceTime = useCallback((speakers: Speaker[], currentSpeakerId: string | null): number => {
    if (!speakers.length) return 0;

    const currentSpeakerIndex = speakers.findIndex(s => s.id === currentSpeakerId);
    if (currentSpeakerIndex === -1) return 0;
    
    const currentSpeaker = speakers[currentSpeakerIndex];
    const speakerStartTime = parseTime(speakerTimes.find(st => st.id === currentSpeaker.id)?.startTime || '');
    
    // Calculate elapsed time based on current time
    const now = new Date();
    const elapsedMinutes = Math.floor((now.getTime() - speakerStartTime.getTime()) / 60000);

    // Calculate true remaining time
    // Original duration minus elapsed time, minimum 0
    const currentMinutesLeft = Math.max(0, currentSpeaker.duration - elapsedMinutes);

    // Add full duration for all upcoming speakers  
    const remainingTime = speakers
      .slice(currentSpeakerIndex + 1)
      .reduce((acc, speaker) => acc + speaker.duration, 0);

    return currentMinutesLeft + remainingTime;
  }, [speakerTimes]);

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
    <div className="min-h-screen text-white relative overflow-hidden flex flex-col">
      {/* Background wrapper */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${conference.theme.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'brightness(0.4)'
        }}
      />
      
      {/* Content wrapper */}
      <div className={`relative z-10 flex-1 flex flex-col ${scaleClass}`}
        style={isPreview ? { width: '400%', height: '400%', transformOrigin: 'top left' } : undefined}>
        
        {/* Main content area */}
        <div className="flex-1">
          {/* Fixed Logos - Enhanced with shadows */}
          <div className="fixed top-24 left-8 flex items-center space-x-8 z-50">
            <img src="/logos/aka.png" alt="AKA Logo" 
              className="h-48 w-48 object-contain bg-black/10 backdrop-blur-sm rounded-full p-4 shadow-lg shadow-black/20 transition-all duration-300 hover:bg-black/20" />
            <img src="/logos/IDF.png" alt="IDF Logo" 
              className="h-48 w-48 object-contain bg-black/10 backdrop-blur-sm rounded-full p-4 shadow-lg shadow-black/20 transition-all duration-300 hover:bg-black/20" />
            <img src="/logos/tikshuv.png" alt="Tikshuv Logo" 
              className="h-48 w-48 object-contain bg-black/10 backdrop-blur-sm rounded-full p-4 shadow-lg shadow-black/20 transition-all duration-300 hover:bg-black/20" />
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
                {/* Updated speaker cards with better contrast and glow effect for current speaker */}
                {displayedSpeakers.map((speakerInfo: SpeakerInfo) => {
                  if (!speakerInfo.speaker) return null;
                  const isCurrent = !speakerInfo.isFinished && !speakerInfo.isUpcoming;
                  return (
                    <div
                      key={speakerInfo.speaker.id}
                      className={`relative backdrop-blur-md rounded-lg p-6 transition-all duration-300 ${
                        isCurrent
                          ? 'bg-gradient-to-r from-blue-600/40 to-blue-400/30 shadow-lg shadow-blue-500/20'
                          : 'bg-black/60 hover:bg-black/70'
                      }`}
                    >
                      <div className={`space-y-3 ${isCurrent ? 'relative z-10' : ''}`}>
                        <div className="flex items-center gap-4">
                          {speakerInfo.speaker.logo && (
                            <img src={`/logos/${speakerInfo.speaker.logo}`}
                              alt={`${speakerInfo.speaker.name} logo`}
                              className={`w-16 h-16 object-contain rounded-md bg-black/40 p-2 transition-transform duration-300 ${
                                isCurrent ? 'ring-1 ring-blue-400/50' : ''
                              }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-xl font-bold truncate ${
                              isCurrent ? 'text-white' : 'text-white/90'
                            }`}>{speakerInfo.speaker.name}</h3>
                            {speakerInfo.speaker.bio && (
                              <p className="text-base text-blue-100/70 truncate italic">{speakerInfo.speaker.bio}</p>
                            )}
                            <p className={`text-base truncate mt-1 ${
                              isCurrent ? 'text-blue-200' : 'text-blue-200/70'
                            }`}>{speakerInfo.speaker.topic}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {(() => {
                            if (speakerInfo.timeRangeObj?.endTime) {
                              return (
                                <span className={`inline-block px-3 py-1 rounded-md font-mono text-base ${
                                  isCurrent 
                                    ? 'bg-blue-500/20 text-blue-100' 
                                    : 'bg-black/40 text-gray-300'
                                }`}>{speakerInfo.timeRange}</span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
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

                    // Calculate time info outside the nested IIFE for reuse
                    const now = new Date();
                    const startTimeDate = parseTime(speakerToShow.timeRangeObj?.startTime || '');
                    const elapsedMs = now.getTime() - startTimeDate.getTime();
                    const elapsedSeconds = Math.floor(elapsedMs / 1000);
                    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
                    const duration = Math.max(0, speakerToShow.speaker.duration * 60); // Convert to seconds 
                    const exceededSeconds = Math.max(0, elapsedSeconds - duration);
                    const exceededMinutes = Math.floor(exceededSeconds / 60);
                    const isExceeded = exceededSeconds > 0 || speakerToShow.speaker.duration < 0;
                    
                    return (
                      <div className={`p-12 rounded-lg transition-all duration-300 backdrop-blur-md ${
                        isExceeded && conference.mode === 'manual'
                          ? 'bg-black/70 shadow-lg shadow-red-500/20'
                          : speakerToShow.isWarning
                            ? 'bg-black/70 shadow-lg shadow-red-500/20 animate-pulse'
                            : speakerToShow.speaker.isBreak 
                              ? 'bg-black/70 shadow-lg shadow-green-500/20'
                              : 'bg-black/60 shadow-lg shadow-blue-500/10'
                      }`}>
                        <div className="flex items-center gap-12">
                          {speakerToShow.speaker.logo && (
                            <div className="relative group">
                              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg opacity-25 group-hover:opacity-40 blur-sm transition duration-300"></div>
                              <div className="relative">
                                <img src={`/logos/${speakerToShow.speaker.logo}`}
                                  alt={`${speakerToShow.speaker.name} logo`}
                                  className="w-48 h-48 object-contain rounded-lg bg-black/60 p-6 shadow-lg transition-transform duration-300 group-hover:scale-105" />
                              </div>
                            </div>
                          )}
                          <div className="flex-1">
                            <h2 className="text-6xl font-bold mb-6 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-blue-200">
                              {speakerToShow.speaker.name}
                            </h2>
                            {speakerToShow.speaker.bio && (
                              <p className="text-2xl text-blue-100/80 mb-6 leading-relaxed font-light">
                                {speakerToShow.speaker.bio}
                              </p>
                            )}
                            <p className="text-4xl text-blue-200/90 mb-8 font-medium tracking-wide">
                              {speakerToShow.speaker.topic}
                            </p>
                            <div className="space-y-6">
                              <div className="flex items-center gap-6">
                                <span className="text-6xl font-mono text-blue-100/90 font-semibold tracking-wider px-4 py-2 rounded-md bg-black/40">
                                  {speakerToShow.timeRange}
                                </span>
                                {/* Progress bar container */}
                                <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-300 ${
                                      isExceeded 
                                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                                        : speakerToShow.isWarning
                                          ? 'bg-gradient-to-r from-yellow-500 to-red-500'
                                          : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                    }`}
                                    style={{ 
                                      width: `${Math.min(100, (elapsedMinutes / speakerToShow.speaker.duration) * 100)}%`
                                    }} 
                                  />
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                {(() => {
                                  // If in manual mode and speaker has exceeded time
                                  if (conference.mode === 'manual' && !speakerToShow.isUpcoming && isExceeded) {
                                    return (
                                      <div className="flex items-center justify-between w-full bg-black/40 rounded-md px-6 py-4">
                                        <div className="flex items-center gap-4">
                                          <span className="text-red-400 font-bold text-3xl">חריגה:</span>
                                          <div className="relative">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-red-600 rounded-md opacity-25 blur-sm"></div>
                                            <span className="relative text-red-300 text-5xl bg-black/60 px-4 py-2 rounded-md block">
                                              {exceededMinutes < 1 ? (
                                                <>
                                                  חרג ב-{exceededSeconds} {exceededSeconds === 1 ? 'שנייה' : 'שניות'}  
                                                </>
                                              ) : (
                                                <>
                                                  חרג ב-{exceededMinutes} {exceededMinutes === 1 ? 'דקה' : 'דקות'}
                                                </>  
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xl text-blue-300/90">חלפו</span>
                                          <div className="relative">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-md opacity-20 blur-sm"></div>
                                            <span className="relative text-3xl text-blue-200 font-mono bg-black/60 px-4 py-2 rounded-md block">
                                              {elapsedMinutes}
                                            </span>
                                          </div>
                                          <span className="text-xl text-blue-300/90">דקות</span>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // If upcoming
                                  if (speakerToShow.isUpcoming) {
                                    return (
                                      <div className="relative w-full">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-md opacity-20 blur-sm"></div>
                                        <p className="relative text-2xl text-blue-100 bg-black/40 rounded-md px-6 py-4">
                                        מתחיל בעוד {speakerToShow.timeLeft} דקות
                                      </p>
                                      </div>
                                    );
                                  }

                                  // Default case
                                  return (
                                    <div className="flex items-center justify-between w-full bg-black/40 rounded-md px-6 py-4">
                                        <p className={`text-5xl tracking-wide ${
                                        speakerToShow.isWarning ? 'text-red-400 font-semibold' : 'text-blue-100'
                                        }`}>
                                        {duration - elapsedSeconds <= 60 ? (
                                          <>נגמר בעוד {duration - elapsedSeconds} שניות</>
                                        ) : (
                                          <>נותרו {speakerToShow.timeLeft} דקות</>
                                        )}
                                        </p>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl text-blue-300/90">דקות שחלפו</span>
                                        <div className="relative">
                                          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-md opacity-20 blur-sm"></div>
                                          <span className="relative text-3xl text-blue-200 font-mono bg-black/60 px-4 py-2 rounded-md block">
                                            {elapsedMinutes}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
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
        </div>

        {/* Remove old footer elements and use the new Footer component */}
        <Footer
          timeLeft={getTotalRemainingConferenceTime(conference.speakers, conference.currentSpeakerId)}
          onPrevSpeaker={() => {
            console.log("Previous Speaker button CLICKED");
            handlePreviousSpeaker();
          }}
          onPrevSpeakerNoTimeChange={() => {
            console.log("Previous Speaker (No Time Change) button CLICKED");
            handlePreviousSpeaker();
          }}
          onNextSpeaker={() => {
            console.log("Next Speaker button CLICKED");
            handleManualNextSpeaker();
          }}
          onNextSpeakerNoTimeChange={() => {
            console.log("Next Speaker (No Time Change) button CLICKED");
            handleManualNextSpeakerNoTimeChange(conference, setConference);
          }}
          totalDuration={conference.speakers.reduce((acc, s) => acc + s.duration, 0)}
          currentProgress={conferenceProgress}
          canGoNext={!hasConferenceEnded && (() => {
            if (!conference.speakers.length) return false;
            if (!conference.currentSpeakerId) return true;
            const currentIndex = conference.speakers.findIndex(s => s.id === conference.currentSpeakerId);
            return currentIndex < conference.speakers.length - 1;
          })()}
          canGoPrev={conference.mode === 'manual' && (() => {
            if (!conference.currentSpeakerId || !conference.speakers.length) return false;
            const currentIndex = conference.speakers.findIndex(s => s.id === conference.currentSpeakerId);
            return currentIndex > 0;
          })()}
          onAddMinute={conference.currentSpeakerId ? handleAddMinute : undefined}
        />
      </div>
    </div>
  );
}

export default DisplayView;
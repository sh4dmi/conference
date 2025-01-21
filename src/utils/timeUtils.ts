import { Speaker } from '../types';

export const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

export const formatTime = (hours: number, minutes: number): string => {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
  const { hours, minutes } = parseTime(timeStr);
  let totalMinutes = hours * 60 + minutes + minutesToAdd;
  
  // Handle overflow past midnight
  totalMinutes = totalMinutes % (24 * 60);
  
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  
  return formatTime(newHours, newMinutes);
};

export const getTimeRange = (startTime: string, duration: number): string => {
  const endTime = addMinutesToTime(startTime, duration);
  return `${startTime}-${endTime}`;
};

export const getCurrentSpeakerInfo = (speakers: Speaker[], startTime: string) => {
  if (!speakers.length || !startTime) return null;
  
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  let currentTime = startTime;
  let currentIndex = -1;
  
  // Find the current time slot
  for (let i = 0; i < speakers.length; i++) {
    const speaker = speakers[i];
    const speakerEndTime = addMinutesToTime(currentTime, speaker.duration);
    
    const { hours: startHours, minutes: startMinutes } = parseTime(currentTime);
    const { hours: endHours, minutes: endMinutes } = parseTime(speakerEndTime);
    
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    // Handle day overflow
    const normalizedCurrentMinutes = currentTotalMinutes;
    const normalizedStartMinutes = startTotalMinutes < currentTotalMinutes ? startTotalMinutes : startTotalMinutes;
    const normalizedEndMinutes = endTotalMinutes < startTotalMinutes ? endTotalMinutes + 24 * 60 : endTotalMinutes;
    
    const isCurrentTimeInRange = 
      normalizedCurrentMinutes >= normalizedStartMinutes && 
      normalizedCurrentMinutes < normalizedEndMinutes;
    
    if (isCurrentTimeInRange) {
      const timeLeft = normalizedEndMinutes - normalizedCurrentMinutes;
      currentIndex = i;
      return {
        speaker,
        timeLeft,
        isWarning: timeLeft <= 1,
        currentIndex: i,
        timeRange: getTimeRange(currentTime, speaker.duration)
      };
    }
    
    currentTime = speakerEndTime;
  }
  
  // If we're before the first speaker
  const firstSpeaker = speakers[0];
  const { hours: firstStartHours, minutes: firstStartMinutes } = parseTime(startTime);
  const firstStartTotalMinutes = firstStartHours * 60 + firstStartMinutes;
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  
  if (currentTotalMinutes < firstStartTotalMinutes) {
    return {
      speaker: firstSpeaker,
      timeLeft: firstStartTotalMinutes - currentTotalMinutes,
      isWarning: false,
      currentIndex: -1,
      timeRange: getTimeRange(startTime, firstSpeaker.duration),
      isUpcoming: true
    };
  }
  
  // If we're after the last speaker
  const lastSpeaker = speakers[speakers.length - 1];
  const lastEndTime = speakers.reduce((time, speaker) => addMinutesToTime(time, speaker.duration), startTime);
  
  return {
    speaker: lastSpeaker,
    timeLeft: 0,
    isWarning: false,
    currentIndex: speakers.length - 1,
    timeRange: getTimeRange(lastEndTime, 0),
    isFinished: true
  };
}; 
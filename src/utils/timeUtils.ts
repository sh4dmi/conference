import { Speaker } from '../types';
import { TimeRange } from '../types/SpeakerInfo';

export function getDateWithTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, mins + minutes);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function getTimeRange(startTime: string, duration: number): string {
  const endTime = addMinutesToTime(startTime, duration);
  return `${startTime}-${endTime}`;
}

export function parseTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  // Keep today's date but set the time
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function isTimeInRange(time: Date, startTime: string, endTime: string): boolean {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  return time >= start && time <= end;
}

export interface SpeakerTime extends Speaker {
  startTime: string;
  endTime: string;
}

export function calculateSpeakerTimes(speakers: Speaker[], conferenceStartTime: string): SpeakerTime[] {
  let currentTime = conferenceStartTime;
  return speakers.map(speaker => {
    const startTime = currentTime;
    const endTime = addMinutesToTime(startTime, speaker.duration);
    currentTime = endTime;
    return {
      ...speaker,
      startTime,
      endTime
    };
  });
}

export function getTimeStatus(timeRange: TimeRange): 'upcoming' | 'current' | 'finished' {
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  // Simple string comparison for times
  if (currentTimeStr >= timeRange.endTime) {
    return 'finished';
  }
  
  if (currentTimeStr < timeRange.startTime) {
    return 'upcoming';
  }
  
  return 'current';
}

export function calculateTimeLeft(timeRange: TimeRange): number {
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  // If the time has passed the end time, return 0
  if (currentTimeStr >= timeRange.endTime) {
    return 0;
  }
  
  // If it's before start time, calculate time until start
  if (currentTimeStr < timeRange.startTime) {
    const [startHours, startMinutes] = timeRange.startTime.split(':').map(Number);
    const totalStartMinutes = startHours * 60 + startMinutes;
    const totalCurrentMinutes = now.getHours() * 60 + now.getMinutes();
    return (totalStartMinutes - totalCurrentMinutes) * 60 * 1000;
  }
  
  // If it's during the talk, calculate remaining time
  const [endHours, endMinutes] = timeRange.endTime.split(':').map(Number);
  const totalEndMinutes = endHours * 60 + endMinutes;
  const totalCurrentMinutes = now.getHours() * 60 + now.getMinutes();
  return (totalEndMinutes - totalCurrentMinutes) * 60 * 1000;
}

export function formatTimeLeft(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function getCurrentSpeakerInfo(speakers: Speaker[], conferenceStartTime: string, warningTimeSeconds: number) {
  let currentTime = conferenceStartTime;
  
  // Calculate all speaker times first
  const speakerTimes = speakers.map(speaker => {
    const startTime = currentTime;
    const endTime = addMinutesToTime(startTime, speaker.duration);
    currentTime = endTime;
    return { speaker, startTime, endTime };
  });
  
  // First look for current speaker
  const currentSpeaker = speakerTimes.find(({ startTime, endTime }) => {
    const timeRange: TimeRange = {
      startTime,
      endTime,
      duration: 0 // Not needed for status check
    };
    return getTimeStatus(timeRange) === 'current';
  });
  
  if (currentSpeaker) {
    const timeRange: TimeRange = {
      startTime: currentSpeaker.startTime,
      endTime: currentSpeaker.endTime,
      duration: currentSpeaker.speaker.duration
    };
    const timeLeft = calculateTimeLeft(timeRange);
    const isWarning = timeLeft <= warningTimeSeconds * 1000;
    
    return {
      speaker: currentSpeaker.speaker,
      timeRange: `${currentSpeaker.startTime}-${currentSpeaker.endTime}`,
      timeLeft: Math.floor(timeLeft / 60000),
      isWarning,
      isUpcoming: false,
      isFinished: false,
      currentIndex: speakers.indexOf(currentSpeaker.speaker)
    };
  }
  
  // Then look for next upcoming speaker
  const upcomingSpeaker = speakerTimes.find(({ startTime, endTime }) => {
    const timeRange: TimeRange = {
      startTime,
      endTime,
      duration: 0 // Not needed for status check
    };
    return getTimeStatus(timeRange) === 'upcoming';
  });
  
  if (upcomingSpeaker) {
    const timeRange: TimeRange = {
      startTime: upcomingSpeaker.startTime,
      endTime: upcomingSpeaker.endTime,
      duration: upcomingSpeaker.speaker.duration
    };
    const timeLeft = calculateTimeLeft(timeRange);
    
    return {
      speaker: upcomingSpeaker.speaker,
      timeRange: `${upcomingSpeaker.startTime}-${upcomingSpeaker.endTime}`,
      timeLeft: Math.floor(timeLeft / 60000),
      isWarning: false,
      isUpcoming: true,
      isFinished: false,
      currentIndex: speakers.indexOf(upcomingSpeaker.speaker)
    };
  }
  
  // If all speakers are finished, return the last one
  if (speakers.length > 0) {
    const lastSpeaker = speakerTimes[speakerTimes.length - 1];
    return {
      speaker: lastSpeaker.speaker,
      timeRange: `${lastSpeaker.startTime}-${lastSpeaker.endTime}`,
      timeLeft: 0,
      isWarning: false,
      isUpcoming: false,
      isFinished: true,
      currentIndex: speakers.length - 1
    };
  }
  
  return null;
} 
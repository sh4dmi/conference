import { Speaker } from '../types';

export interface TimeRange {
  startTime: string;
  endTime: string;
  duration: number;
  id?: string;
  name?: string;
  topic?: string;
  order?: number;
}

export interface SpeakerInfo {
  speaker: Speaker | undefined;
  timeRange: string;
  timeLeft: number;
  isWarning: boolean;
  isUpcoming: boolean;
  isFinished: boolean;
  currentIndex: number;
  timeRangeObj?: TimeRange;
} 
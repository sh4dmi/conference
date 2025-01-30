export interface Conference {
  id: string;
  name: string;
  // Remove date field and add days configuration
  days: {
    dayOfWeek: number; // 0-6 for Sunday-Saturday
    startTime: string;
    speakers: Speaker[];
    currentSpeakerId: string | null;
  }[];
  theme: {
    background: string;
    font: string;
    backgroundImage: string;
  };
  customBackgrounds: string[];
  showUpcomingOnly: boolean;
  warningTime?: number;
}

export interface Speaker {
  id: string;
  name: string;
  topic: string;
  duration: number;
  bio?: string;
  logo?: string;
  isBreak?: boolean;
  order: number;
  dayIndex: number; // Add dayIndex to track which day this speaker belongs to
} 
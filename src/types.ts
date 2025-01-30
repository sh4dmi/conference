export interface Speaker {
  id: string;
  name: string;
  topic: string;
  duration: number;
  isBreak?: boolean;
  startTime?: string; // Format: "HH:mm"
  logo?: string;
  order: number;
  bio?: string;
}

export interface Conference {
  id: string;
  name: string;
  startTime: string; // Format: "HH:mm"
  speakers: Speaker[];
  currentSpeakerId: string | null;
  theme: {
    background: string;
    font: string;
    backgroundImage?: string;
  };
  customBackgrounds: {
    name: string;
    url: string;
  }[];
  warningTime: number; // Time in seconds before end to show warning
  showUpcomingOnly: boolean; // Whether to show only upcoming speakers
}

export interface Timer {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  delay: number;
}

export interface EditingSpeaker extends Speaker {
  isEditing?: boolean;
}
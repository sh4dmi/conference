export interface Speaker {
  id: string;
  name: string;
  topic: string;
  duration: number;
  isBreak?: boolean;
  startTime?: string; // Format: "HH:mm"
  logo?: string;
  order: number;
}

export interface Conference {
  id: string;
  name: string;
  date: string;
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
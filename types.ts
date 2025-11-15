export type Voice = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr' | 'custom';

export interface VoiceOption {
  value: Voice;
  label: string;
}

export interface LanguageOption {
  value: string;
  label:string;
}

export interface User {
  email: string;
}

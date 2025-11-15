import type { VoiceOption, LanguageOption } from './types';

export const VOICE_OPTIONS: VoiceOption[] = [
  { value: 'Zephyr', label: 'Zephyr (Friendly)' },
  { value: 'Kore', label: 'Kore (Calm)' },
  { value: 'Puck', label: 'Puck (Playful)' },
  { value: 'Charon', label: 'Charon (Deep)' },
  { value: 'Fenrir', label: 'Fenrir (Assertive)' },
  { value: 'custom', label: 'Upload Custom Voice' },
];

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'ar', label: 'Arabic' },
  { value: 'zh', label: 'Chinese (Mandarin)' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'es', label: 'Spanish' },
];
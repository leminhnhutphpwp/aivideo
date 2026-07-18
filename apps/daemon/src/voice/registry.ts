export interface VoiceEntry {
  voiceId: string;
  name: string;
  provider: string;
  labels?: Record<string, string>;
}

type VoiceList = VoiceEntry[];

const VOICES_BY_PROVIDER: Record<string, VoiceList> = {
  'ckey': [
    { voiceId: 'vi-VN-NamMinhNeural', name: 'Nam Minh (Nam, Bắc)', provider: 'ckey', labels: { gender: 'male', accent: 'vietnam-bac' } },
    { voiceId: 'google-tts/vi', name: 'Google TTS (Nữ)', provider: 'ckey', labels: { gender: 'female', accent: 'vietnam' } },
    { voiceId: 'vi-VN-HoaiMyNeural', name: 'Hoài My (Nữ, Nam)', provider: 'ckey', labels: { gender: 'female', accent: 'vietnam-nam' } },
  ],
  'viettel': [
    { voiceId: 'viettel-vietnam', name: 'Viettel AI (Tổng hợp)', provider: 'viettel', labels: { gender: 'female', accent: 'vietnam' } },
  ],
  'elevenlabs': [
    { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (English, US)', provider: 'elevenlabs', labels: { gender: 'female', accent: 'us' } },
    { voiceId: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (English, US)', provider: 'elevenlabs', labels: { gender: 'female', accent: 'us' } },
  ],
};

export function getVoiceListForProvider(provider: string, _externalVoices?: VoiceList): VoiceList {
  return VOICES_BY_PROVIDER[provider] || [];
}

export function getDefaultProvider(): string {
  return process.env['TTS_PROVIDER'] || 'ckey';
}

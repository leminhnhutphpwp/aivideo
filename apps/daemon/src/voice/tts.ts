const TTS_PROVIDER = process.env['TTS_PROVIDER'] || 'openai';

const TTS_PROVIDER_CONFIG: Record<string, [string, string]> = {
  'openai': ['openai', 'gpt-4o-mini-tts'],
  'ckey': ['ckey', 'tts-1'],
  'elevenlabs': ['elevenlabs', 'elevenlabs-v3'],
  'viettel': ['openai', 'gpt-4o-mini-tts'],
};

export function resolveTtsModelForVoice(_voiceId: string, models: any[]): any | undefined {
  const config = TTS_PROVIDER_CONFIG[TTS_PROVIDER];
  if (config) {
    const [daemonProvider, defaultModel] = config;
    const exact = models.find((m: any) => m.id === defaultModel);
    if (exact) return exact;
    const match = models.find((m: any) => m.provider === daemonProvider && m.caps?.includes('tts'));
    if (match) return match;
    const fallback = models.find((m: any) => m.provider === daemonProvider);
    if (fallback) return fallback;
  }
  return models.find((m: any) => m.caps?.includes('tts')) || models[0];
}

export { TTS_PROVIDER, TTS_PROVIDER_CONFIG };

import { request as httpsRequest } from 'node:https';
import type { IncomingMessage } from 'node:http';
import { Buffer } from 'node:buffer';

export interface LlmConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export function generateVoiceoverScript(videoPrompt: string, config: LlmConfig): Promise<string> {
  const baseUrl = (config.baseUrl || 'https://api.openai.com').replace(/\/+$/, '');
  const url = new URL('/v1/chat/completions', baseUrl);
  const model = config.model || 'gpt-4o-mini';

  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: `You are a voiceover scriptwriter for advertising and product-intro videos.
Task: from a video description, write 1-2 short, natural voiceover sentences, as if speaking directly to the audience.
Requirements:
- Short (max 50 words)
- Natural, conversational tone
- No cinematic or technical jargon
- Focus on emotion and experience
- IMPORTANT: write the narration itself in VIETNAMESE (the audience is Vietnamese)` },
      { role: 'user', content: `Write the voiceover narration (in Vietnamese) for a video described as: "${videoPrompt}"` },
    ],
    max_tokens: 150,
    temperature: 0.7,
  });

  const options = { hostname: url.hostname, path: url.pathname + url.search, method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` } };

  return new Promise((resolve, reject) => {
    const req = httpsRequest(options, (res: IncomingMessage) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`LLM API error ${res.statusCode}: ${data.slice(0, 200)}`));
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.message?.content?.trim();
          if (!text) return reject(new Error('LLM returned empty response'));
          resolve(text);
        } catch (err: any) { reject(new Error(`Failed to parse LLM response: ${err.message}`)); }
      });
    });
    req.on('error', (err) => reject(new Error(`LLM request failed: ${err.message}`)));
    req.write(body);
    req.end();
  });
}

// Live FLF ("khôi phục nhà") verification against real DashScope.
// Runs inside the daemon container (DASHSCOPE_API_KEY, network, ffmpeg).
// Uses base64 data URLs end-to-end to avoid cross-service OSS 403s.
// Steps: t2i old house -> i2i restored house (qwen-image-2.0-pro) -> wan i2v FLF -> mp4.
// Usage: node flf-live-check.mjs [videoModel]

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const KEY = process.env.DASHSCOPE_API_KEY || process.env.QWENCLOUD_API_KEY;
const BASE = 'https://dashscope-intl.aliyuncs.com/api/v1';
const OUT = '/tmp/flf';
const VIDEO_MODEL = process.argv[2] || 'wan2.7-i2v-2026-04-25';
const FALLBACKS = ['wan2.6-i2v'];
const EDIT_MODEL = 'qwen-image-2.0-pro';

fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
if (!KEY) { console.error('NO KEY'); process.exit(2); }
log('key tail', KEY.slice(-8), 'video model', VIDEO_MODEL);

// PNG buffer -> compressed JPEG data URL (<=1280w) to keep video payload small.
function toJpegDataUrl(pngBuf, name) {
  const inP = `${OUT}/${name}.png`, outP = `${OUT}/${name}.jpg`;
  fs.writeFileSync(inP, pngBuf);
  execFileSync('ffmpeg', ['-y', '-i', inP, '-vf', "scale='min(1280,iw)':-2", '-q:v', '4', outP], { stdio: 'ignore' });
  const jpg = fs.readFileSync(outP);
  return { dataUrl: `data:image/jpeg;base64,${jpg.toString('base64')}`, bytes: jpg.length };
}

async function genImageBytes(prompt, srcDataUrl, model) {
  const content = [];
  if (srcDataUrl) content.push({ image: srcDataUrl });
  content.push({ text: prompt });
  const body = { model, input: { messages: [{ role: 'user', content }] }, parameters: { size: '1664*928' } };
  const r = await fetch(`${BASE}/services/aigc/multimodal-generation/generation`, {
    method: 'POST', headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`image ${model} ${r.status}: ${txt.slice(0, 300)}`);
  const url = JSON.parse(txt)?.output?.choices?.[0]?.message?.content?.find((c) => c.image)?.image;
  if (!url) throw new Error(`no image url from ${model}: ${txt.slice(0, 200)}`);
  const b = Buffer.from(await (await fetch(url)).arrayBuffer());
  return b;
}

async function submitVideo(model, firstDataUrl, lastDataUrl) {
  const body = {
    model,
    input: {
      prompt: 'Time-lapse restoration: the old ruined house is gradually repaired into a beautiful restored house, same camera angle, smooth morphing transition',
      media: [{ type: 'first_frame', url: firstDataUrl }, { type: 'last_frame', url: lastDataUrl }],
    },
    parameters: { resolution: '1080P', duration: 5, prompt_extend: false, watermark: false },
  };
  const r = await fetch(`${BASE}/services/aigc/video-generation/video-synthesis`, {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json', 'x-dashscope-async': 'enable' },
    body: JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status, txt: await r.text() };
}

async function poll(taskId) {
  const r = await fetch(`${BASE}/tasks/${encodeURIComponent(taskId)}`, { headers: { authorization: `Bearer ${KEY}` } });
  const txt = await r.text();
  if (!r.ok) return { status: 'POLL_ERR', raw: txt };
  const d = JSON.parse(txt);
  return { status: d?.output?.task_status, videoUrl: d?.output?.video_url, raw: d?.output };
}

(async () => {
  const t0 = Date.now();
  log('t2i OLD house...');
  const oldPng = await genImageBytes('old ruined abandoned house, cracked walls, broken roof, overgrown yard, daytime, wide shot, photorealistic', null, 'qwen-image-plus');
  const oldFrame = toJpegDataUrl(oldPng, 'old');
  log(`OLD ok, jpeg ${oldFrame.bytes} bytes`);

  log(`i2i RESTORED house (${EDIT_MODEL})...`);
  const restoredPng = await genImageBytes('fully restored beautiful house, new roof, fresh paint, clean tidy yard, SAME camera angle and composition, photorealistic', oldFrame.dataUrl, EDIT_MODEL);
  const restFrame = toJpegDataUrl(restoredPng, 'restored');
  log(`RESTORED ok, jpeg ${restFrame.bytes} bytes`);

  const models = [VIDEO_MODEL, ...FALLBACKS];
  let taskId = null, usedModel = null;
  for (const m of models) {
    log(`submit video model=${m} (payload ~${Math.round((oldFrame.bytes + restFrame.bytes) * 1.34 / 1024)}KB b64)...`);
    const res = await submitVideo(m, oldFrame.dataUrl, restFrame.dataUrl);
    log(`  -> HTTP ${res.status} :: ${res.txt.slice(0, 400)}`);
    if (res.ok) {
      const id = JSON.parse(res.txt)?.output?.task_id;
      if (id) { taskId = id; usedModel = m; break; }
    }
  }
  if (!taskId) { log('BLOCKER: no video task accepted'); process.exit(3); }
  log(`task=${taskId} model=${usedModel}`);

  let videoUrl = null, last = '';
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 12000));
    const p = await poll(taskId);
    last = p.status;
    log(`  status=${p.status} (${Math.round((Date.now() - t0) / 1000)}s)`);
    if (p.status === 'SUCCEEDED') { videoUrl = p.videoUrl; break; }
    if (p.status === 'FAILED' || p.status === 'CANCELLED') { log('FAIL raw:', JSON.stringify(p.raw).slice(0, 400)); break; }
  }
  if (!videoUrl) { log(`no video url, last=${last}`); process.exit(4); }

  log('download video', videoUrl.slice(0, 70));
  const vb = Buffer.from(await (await fetch(videoUrl)).arrayBuffer());
  fs.writeFileSync(`${OUT}/flf_restoration.mp4`, vb);
  log(`DONE model=${usedModel} bytes=${vb.length} latency=${Math.round((Date.now() - t0) / 1000)}s -> ${OUT}/flf_restoration.mp4`);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
const mode = process.argv[2] || 'stills';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.log('[err]', e.message));
await page.goto('http://127.0.0.1:8765/index.html');
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
fs.writeFileSync('cues.json', JSON.stringify(await page.evaluate(() => window.cues)));
if (mode === 'stills') {
  const times = process.argv.slice(3).map(Number);
  fs.mkdirSync('stills', { recursive: true });
  for (const t of times) {
    await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({ path: `stills/t${t.toFixed(2)}.jpg`, type: 'jpeg', quality: 80 });
  }
} else {
  const fps = 30, dur = Number(process.argv[3] || 100), start = Number(process.argv[4] || 0);
  const out = process.argv[5] || 'video.mp4';
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(dur * fps);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const t = start + i / fps;
    await page.evaluate(t => window.renderAt(t), t);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${n} t=${t.toFixed(2)} elapsed ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
await browser.close();

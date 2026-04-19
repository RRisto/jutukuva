import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function unpack(p) {
  if (!p) return p;
  return p.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
}

export function getFfmpegPath() {
  const raw = require('ffmpeg-static');
  return unpack(raw);
}

export function getFfprobePath() {
  const installer = require('@ffprobe-installer/ffprobe');
  return unpack(installer.path);
}

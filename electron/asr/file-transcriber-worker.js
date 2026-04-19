import { spawn } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import Module from 'module';

const require = createRequire(import.meta.url);

const SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2;
const FRAME_SAMPLES = 1600;
const FRAME_BYTES = FRAME_SAMPLES * BYTES_PER_SAMPLE;
const PROGRESS_INTERVAL_MS = 500;
const MIN_SEGMENT_WINDOW_SEC = 5.0;

let recognizer = null;
let cancelled = false;
let activeFfmpeg = null;

function post(msg) {
  process.parentPort.postMessage(msg);
}

function setupLibraryPath(libPath) {
  if (!libPath) return;
  const platform = process.platform;
  if (platform === 'darwin') {
    process.env.DYLD_LIBRARY_PATH = `${libPath}:${process.env.DYLD_LIBRARY_PATH || ''}`;
  } else if (platform === 'linux') {
    process.env.LD_LIBRARY_PATH = `${libPath}:${process.env.LD_LIBRARY_PATH || ''}`;
  } else if (platform === 'win32') {
    process.env.PATH = `${libPath};${process.env.PATH || ''}`;
  }
}

function loadSherpa(libPath) {
  const nativeAddonPath = path.join(libPath, 'sherpa-onnx.node');
  const addon = require(nativeAddonPath);

  const addonJsPath = require.resolve('sherpa-onnx-node/addon.js');
  const cachedModule = new Module(addonJsPath);
  cachedModule.filename = addonJsPath;
  cachedModule.paths = Module._nodeModulePaths(path.dirname(addonJsPath));
  cachedModule.loaded = true;
  cachedModule.exports = addon;
  require.cache[addonJsPath] = cachedModule;

  const streamingAsr = require('sherpa-onnx-node/streaming-asr.js');
  return { OnlineRecognizer: streamingAsr.OnlineRecognizer };
}

function buildConfig(modelDir) {
  return {
    featConfig: { sampleRate: SAMPLE_RATE, featureDim: 80 },
    modelConfig: {
      transducer: {
        encoder: path.join(modelDir, 'encoder.onnx'),
        decoder: path.join(modelDir, 'decoder.onnx'),
        joiner: path.join(modelDir, 'joiner.onnx'),
      },
      tokens: path.join(modelDir, 'tokens.txt'),
      numThreads: 2,
      provider: 'cpu',
      debug: 0,
    },
    enableEndpoint: true,
    rule1MinTrailingSilence: 2.0,
    rule2MinTrailingSilence: 0.8,
    rule3MinUtteranceLength: 20.0,
  };
}

function spawnFfmpegForChannel(ffmpegPath, filePath, channelIndex, totalChannels) {
  const args = ['-hide_banner', '-loglevel', 'error', '-i', filePath];

  if (totalChannels > 1) {
    args.push('-af', `pan=mono|c0=c${channelIndex}`);
  } else {
    args.push('-ac', '1');
  }

  args.push('-ar', String(SAMPLE_RATE), '-f', 's16le', '-acodec', 'pcm_s16le', 'pipe:1');

  const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  return proc;
}

function int16BufferToFloat32(buf, byteLength) {
  const numSamples = byteLength / 2;
  const out = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const s = buf.readInt16LE(i * 2);
    out[i] = s / 32768;
  }
  return out;
}

async function transcribeChannel({ ffmpegPath, filePath, channelIndex, totalChannels, durationSec }) {
  return new Promise((resolve, reject) => {
    const stream = recognizer.createStream();
    let totalSamples = 0;
    let lastProgressAt = 0;
    let pendingBytes = Buffer.alloc(0);
    let stderrBuf = '';

    const ffmpeg = spawnFfmpegForChannel(ffmpegPath, filePath, channelIndex, totalChannels);
    activeFfmpeg = ffmpeg;

    ffmpeg.stderr.on('data', (d) => { stderrBuf += d.toString(); });
    ffmpeg.on('error', (err) => {
      activeFfmpeg = null;
      reject(new Error(`ffmpeg spawn failed: ${err.message}`));
    });

    ffmpeg.stdout.on('data', (chunk) => {
      if (cancelled) { ffmpeg.kill(); return; }

      pendingBytes = pendingBytes.length === 0 ? chunk : Buffer.concat([pendingBytes, chunk]);

      while (pendingBytes.length >= FRAME_BYTES) {
        const frameBuf = pendingBytes.subarray(0, FRAME_BYTES);
        pendingBytes = pendingBytes.subarray(FRAME_BYTES);

        const samples = int16BufferToFloat32(frameBuf, FRAME_BYTES);

        try {
          stream.acceptWaveform({ sampleRate: SAMPLE_RATE, samples });
          while (recognizer.isReady(stream)) recognizer.decode(stream);

          if (recognizer.isEndpoint(stream)) {
            const result = recognizer.getResult(stream);
            const text = (result?.text || '').trim();
            if (text) {
              const endSec = totalSamples / SAMPLE_RATE;
              const startSec = Math.max(0, endSec - MIN_SEGMENT_WINDOW_SEC);
              post({ type: 'segment', channel: channelIndex, text, start: startSec, end: endSec });
            }
            recognizer.reset(stream);
          }
        } catch (err) {
          ffmpeg.kill();
          reject(new Error(`Decode error: ${err.message}`));
          return;
        }

        totalSamples += FRAME_SAMPLES;

        const now = Date.now();
        if (now - lastProgressAt > PROGRESS_INTERVAL_MS) {
          lastProgressAt = now;
          post({
            type: 'progress',
            channel: channelIndex,
            totalChannels,
            processedSec: totalSamples / SAMPLE_RATE,
            totalSec: durationSec
          });
        }
      }
    });

    ffmpeg.stdout.on('end', () => {
      if (cancelled) { resolve(); return; }

      if (pendingBytes.length >= 2) {
        const aligned = pendingBytes.length - (pendingBytes.length % 2);
        const samples = int16BufferToFloat32(pendingBytes.subarray(0, aligned), aligned);
        try {
          stream.acceptWaveform({ sampleRate: SAMPLE_RATE, samples });
        } catch (_) { /* ignore */ }
        totalSamples += samples.length;
      }

      try {
        stream.inputFinished();
        while (recognizer.isReady(stream)) recognizer.decode(stream);
        const result = recognizer.getResult(stream);
        const text = (result?.text || '').trim();
        if (text) {
          const endSec = totalSamples / SAMPLE_RATE;
          const startSec = Math.max(0, endSec - MIN_SEGMENT_WINDOW_SEC);
          post({ type: 'segment', channel: channelIndex, text, start: startSec, end: endSec });
        }
      } catch (err) {
        reject(new Error(`Flush error: ${err.message}`));
        return;
      }
    });

    ffmpeg.on('close', (code) => {
      activeFfmpeg = null;
      if (cancelled) { resolve(); return; }
      if (code !== 0 && code !== null) {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderrBuf}`));
        return;
      }
      post({
        type: 'progress',
        channel: channelIndex,
        totalChannels,
        processedSec: durationSec,
        totalSec: durationSec
      });
      resolve();
    });
  });
}

async function runJob(msg) {
  const { filePath, channelsToProcess, totalChannels, durationSec, modelDir, libPath, ffmpegPath } = msg;

  try {
    setupLibraryPath(libPath);
    const sherpa = loadSherpa(libPath);
    recognizer = new sherpa.OnlineRecognizer(buildConfig(modelDir));

    for (const ch of channelsToProcess) {
      if (cancelled) break;
      post({ type: 'channelStart', channel: ch, totalChannels });
      await transcribeChannel({
        ffmpegPath,
        filePath,
        channelIndex: ch,
        totalChannels,
        durationSec
      });
      post({ type: 'channelDone', channel: ch, totalChannels });
    }

    post({ type: cancelled ? 'cancelled' : 'done' });
  } catch (err) {
    post({ type: 'error', message: err.message || String(err) });
  } finally {
    recognizer = null;
    try { process.parentPort.removeAllListeners('message'); } catch (_) { /* ignore */ }
    setTimeout(() => process.exit(0), 150);
  }
}

process.parentPort.on('message', (event) => {
  const msg = event.data;
  if (msg?.type === 'start') {
    runJob(msg);
  } else if (msg?.type === 'cancel') {
    cancelled = true;
    if (activeFfmpeg) {
      try { activeFfmpeg.kill('SIGKILL'); } catch (_) { /* ignore */ }
    }
  }
});

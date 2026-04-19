import { utilityProcess, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLibraryPath, resolveModelPath, MODEL_INFO } from './sherpa-config.js';
import { isModelDownloaded, downloadModel } from './model-downloader.js';
import { probeAudioFile } from './audio-probe.js';
import { getFfmpegPath } from './ffmpeg-path.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = path.join(__dirname, 'file-transcriber-worker.js');

const jobs = new Map();
let nextJobId = 1;

function buildJobId() {
  return `file-job-${Date.now()}-${nextJobId++}`;
}

export async function ensureModelReady(onDownloadProgress) {
  const exists = await isModelDownloaded();
  if (exists) {
    return resolveModelPath(MODEL_INFO.name, MODEL_INFO.files);
  }
  return downloadModel(onDownloadProgress);
}

export async function probeFile(filePath) {
  return probeAudioFile(filePath);
}

export async function startFileTranscription({
  filePath,
  channelsToProcess,
  totalChannels,
  durationSec,
  onSegment,
  onProgress,
  onChannelStart,
  onChannelDone,
  onDone,
  onError,
  onDownloadProgress
}) {
  const modelDir = await ensureModelReady(onDownloadProgress);
  const libPath = getLibraryPath();
  const ffmpegPath = getFfmpegPath();

  const jobId = buildJobId();
  const child = utilityProcess.fork(WORKER_PATH, [], {
    serviceName: `jutukuva-file-transcriber-${jobId}`,
    stdio: 'pipe'
  });

  const collectedSegments = [];
  const state = { jobId, child, cancelled: false, finished: false };
  jobs.set(jobId, state);

  child.stdout?.on('data', (d) => {
    console.log(`[FileTranscribe ${jobId}] stdout:`, d.toString());
  });
  child.stderr?.on('data', (d) => {
    console.error(`[FileTranscribe ${jobId}] stderr:`, d.toString());
  });

  child.on('message', (msg) => {
    if (!msg) return;
    switch (msg.type) {
      case 'segment':
        collectedSegments.push({
          text: msg.text,
          start: msg.start,
          end: msg.end,
          channel: msg.channel
        });
        onSegment?.(msg);
        break;
      case 'progress':
        onProgress?.(msg);
        break;
      case 'channelStart':
        onChannelStart?.(msg);
        break;
      case 'channelDone':
        onChannelDone?.(msg);
        break;
      case 'done':
        state.finished = true;
        onDone?.({
          jobId,
          segments: collectedSegments.slice().sort((a, b) => a.start - b.start),
          cancelled: false
        });
        jobs.delete(jobId);
        break;
      case 'cancelled':
        state.finished = true;
        onDone?.({
          jobId,
          segments: collectedSegments.slice().sort((a, b) => a.start - b.start),
          cancelled: true
        });
        jobs.delete(jobId);
        break;
      case 'error':
        state.finished = true;
        onError?.({ jobId, message: msg.message });
        jobs.delete(jobId);
        break;
    }
  });

  child.on('exit', (code) => {
    if (!state.finished) {
      onError?.({ jobId, message: `Worker exited prematurely with code ${code}` });
      jobs.delete(jobId);
    }
  });

  child.postMessage({
    type: 'start',
    filePath,
    channelsToProcess,
    totalChannels,
    durationSec,
    modelDir,
    libPath,
    ffmpegPath
  });

  return jobId;
}

export function cancelFileTranscription(jobId) {
  const state = jobs.get(jobId);
  if (!state) return false;
  state.cancelled = true;
  try { state.child.postMessage({ type: 'cancel' }); } catch (_) { /* ignore */ }
  setTimeout(() => {
    if (jobs.has(jobId)) {
      try { state.child.kill(); } catch (_) { /* ignore */ }
    }
  }, 2000);
  return true;
}

export function cancelAllJobs() {
  for (const jobId of Array.from(jobs.keys())) {
    cancelFileTranscription(jobId);
  }
}

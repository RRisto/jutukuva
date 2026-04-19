import { spawn } from 'child_process';
import { getFfprobePath } from './ffmpeg-path.js';

export function probeAudioFile(filePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(getFfprobePath(), [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]);

    let stdout = '';
    let stderr = '';
    ffprobe.stdout.on('data', (d) => { stdout += d.toString(); });
    ffprobe.stderr.on('data', (d) => { stderr += d.toString(); });

    ffprobe.on('error', (err) => reject(err));
    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited ${code}: ${stderr}`));
        return;
      }
      try {
        const info = JSON.parse(stdout);
        const audioStream = (info.streams || []).find((s) => s.codec_type === 'audio');
        if (!audioStream) {
          reject(new Error('No audio stream found in file'));
          return;
        }
        resolve({
          durationSec: parseFloat(info.format?.duration ?? audioStream.duration ?? '0') || 0,
          channels: parseInt(audioStream.channels ?? '1', 10),
          sampleRate: parseInt(audioStream.sample_rate ?? '0', 10),
          codec: audioStream.codec_name || 'unknown',
          sizeBytes: parseInt(info.format?.size ?? '0', 10) || 0
        });
      } catch (err) {
        reject(new Error(`Failed to parse ffprobe output: ${err.message}`));
      }
    });
  });
}

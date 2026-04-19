#!/usr/bin/env node
/*
 * Downloads the sherpa-onnx ASR model into models/<model-name>/ at repo root.
 * Idempotent — skips files that already exist at non-zero size.
 * Called by the `download-model` npm script and by `electron:build` before packaging.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const MODEL_NAME = 'streaming-zipformer-large.et-en.w2n';
const HF_REPO = 'TalTechNLP/streaming-zipformer-large.et-en.w2n';
const FILES = ['encoder.onnx', 'decoder.onnx', 'joiner.onnx', 'tokens.txt'];

const modelDir = path.join(__dirname, '..', 'models', MODEL_NAME);

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const tmp = dest + '.part';
    const fetchUrl = (u, redirects) => {
      https
        .get(u, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            if (redirects > 10) {
              reject(new Error('Too many redirects'));
              return;
            }
            res.resume();
            fetchUrl(res.headers.location, redirects + 1);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${u}`));
            return;
          }
          const total = parseInt(res.headers['content-length'] || '0', 10);
          let done = 0;
          const file = fs.createWriteStream(tmp);
          res.on('data', (chunk) => {
            done += chunk.length;
            if (total && process.stdout.isTTY) {
              const pct = Math.round((done / total) * 100);
              process.stdout.write(`\r  ${path.basename(dest)}: ${pct}%   `);
            }
          });
          res.pipe(file);
          file.on('finish', () => {
            file.close((err) => {
              if (err) {
                reject(err);
                return;
              }
              fs.renameSync(tmp, dest);
              if (process.stdout.isTTY) process.stdout.write('\n');
              console.log(
                `  ${path.basename(dest)}: done (${(done / 1024 / 1024).toFixed(1)} MB)`
              );
              resolve();
            });
          });
          file.on('error', (err) => {
            fs.unlink(tmp, () => {});
            reject(err);
          });
        })
        .on('error', reject);
    };
    fetchUrl(url, 0);
  });
}

async function main() {
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }

  for (const file of FILES) {
    const dest = path.join(modelDir, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      const size = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
      console.log(`  ${file}: already present (${size} MB)`);
      continue;
    }
    const url = `https://huggingface.co/${HF_REPO}/resolve/main/${file}`;
    console.log(`  downloading ${file}...`);
    await download(url, dest);
  }

  console.log('\nModel ready at:', modelDir);
}

main().catch((err) => {
  console.error('\nFailed to download model:', err.message || err);
  process.exit(1);
});

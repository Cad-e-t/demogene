
import fs from 'fs';
import https from 'https';
import { execSync } from 'child_process';

export function getDuration(filePath) {
  try {
      const out = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${filePath}"`);
      const json = JSON.parse(out.toString());
      return { width: json.streams[0].width, height: json.streams[0].height };
  } catch(e) {
      console.warn("ffprobe resolution fetch failed, defaulting to 1920x1080", e.message);
      return { width: 1920, height: 1080 };
  }
}

export function getDurationValue(filePath) {
  try {
      const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
      const val = parseFloat(out.toString().trim());
      return isNaN(val) ? 0.0 : val;
  } catch (e) {
      console.warn("ffprobe duration fetch failed, defaulting to 0", e.message);
      return 0.0;
  }
}

export function parseTime(t) {
    if (typeof t === 'number') return t;
    if (!t) return 0;
    const parts = t.toString().split(':').map(parseFloat);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0];
}

export async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download file: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

export function cleanup(files) {
    files.forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
    });
}

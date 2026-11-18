import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegPath from 'ffmpeg-static';

export function getFFmpegExecutable(): string {
  let rawPath = typeof ffmpegPath === 'string' ? ffmpegPath : (ffmpegPath as any)?.default;
  if (rawPath && typeof rawPath === 'string' && fs.existsSync(rawPath)) {
    return rawPath;
  }

  // Fallback check directly inside project node_modules (Windows & Unix)
  const localWindowsPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  if (fs.existsSync(localWindowsPath)) {
    return localWindowsPath;
  }

  const localUnixPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
  if (fs.existsSync(localUnixPath)) {
    return localUnixPath;
  }

  // System fallback
  return 'ffmpeg';
}

/**
 * Detects the primary video codec of an input video file using FFmpeg
 */
export async function detectVideoCodec(videoPath: string): Promise<string> {
  const ffmpeg = getFFmpegExecutable();
  return new Promise((resolve) => {
    execFile(ffmpeg, ['-i', videoPath], (error, stdout, stderr) => {
      const output = (stderr || '') + (stdout || '');
      const match = output.match(/Stream #\d+:\d+.*Video:\s*([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        resolve(match[1].toLowerCase());
      } else {
        resolve('unknown');
      }
    });
  });
}

/**
 * Extracts raw high-quality WAV audio from input video file
 */
export async function extractAudioFromVideo(videoPath: string, outputWavPath: string): Promise<void> {
  const ffmpeg = getFFmpegExecutable();

  // Ensure target directory exists
  const dir = path.dirname(outputWavPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Arguments: -y (overwrite), -i input, -vn (disable video), -ar 44100 (sample rate), -ac 2 (channels stereo)
  const args = ['-y', '-i', videoPath, '-vn', '-ar', '44100', '-ac', '2', outputWavPath];

  return new Promise((resolve, reject) => {
    execFile(ffmpeg, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('FFmpeg extraction error:', stderr);
        return reject(new Error(`FFmpeg audio extraction failed: ${error.message}`));
      }
      resolve();
    });
  });
}

/**
 * Combines original video track with newly separated clean audio track into a final MP4.
 * Automatically detects whether the video codec is browser-compatible (H.264/AVC).
 * If the source video uses HEVC (H.265) or another format unsupported by HTML5 video in browsers,
 * it transcodes the video track to standard H.264 (yuv420p) with faststart so the browser can play it directly.
 */
export async function combineVideoAndAudio(
  originalVideoPath: string,
  cleanAudioPath: string,
  outputVideoPath: string
): Promise<void> {
  const ffmpeg = getFFmpegExecutable();

  const dir = path.dirname(outputVideoPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const codec = await detectVideoCodec(originalVideoPath);
  const isWebCompatible = codec.includes('h264') || codec.includes('avc1');

  const args = [
    '-y',
    '-i', originalVideoPath,
    '-i', cleanAudioPath,
  ];

  if (isWebCompatible) {
    // Lossless stream copy if already standard H.264
    args.push('-c:v', 'copy');
  } else {
    // Transcode to standard H.264 for universal HTML5 browser playback (fixes black screen on phone videos)
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p');
  }

  args.push(
    '-c:a', 'aac',
    '-b:a', '192k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-movflags', '+faststart',
    '-shortest',
    outputVideoPath
  );

  return new Promise((resolve, reject) => {
    execFile(ffmpeg, args, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('FFmpeg remuxing error:', stderr);
        return reject(new Error(`FFmpeg video remuxing failed: ${error.message}`));
      }
      resolve();
    });
  });
}

/**
 * Converts a non-compatible video (like HEVC from phones) to standard web-compatible H.264
 * so it can be previewed in the browser.
 */
export async function ensureWebCompatiblePreview(videoPath: string, outputPath: string): Promise<boolean> {
  const codec = await detectVideoCodec(videoPath);
  if (codec.includes('h264') || codec.includes('avc1')) {
    return false;
  }

  const ffmpeg = getFFmpegExecutable();
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const args = [
    '-y',
    '-i', videoPath,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    '-movflags', '+faststart',
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    execFile(ffmpeg, args, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('FFmpeg preview transcoding error:', stderr);
        return reject(error);
      }
      resolve(true);
    });
  });
}

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
 * Combines original video track with newly separated clean audio track into a final MP4
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

  const args = [
    '-y',
    '-i', originalVideoPath,
    '-i', cleanAudioPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-shortest',
    outputVideoPath
  ];

  return new Promise((resolve, reject) => {
    execFile(ffmpeg, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('FFmpeg remuxing error:', stderr);
        return reject(new Error(`FFmpeg video remuxing failed: ${error.message}`));
      }
      resolve();
    });
  });
}

import { NextResponse } from 'next/server';
import { getFFmpegExecutable } from '@/lib/ffmpeg-helper';
import { exec } from 'child_process';
import fs from 'fs';

export async function GET() {
  const ffmpegPath = getFFmpegExecutable();
  const ffmpegAvailable = fs.existsSync(ffmpegPath) || ffmpegPath === 'ffmpeg';

  const demucsStatus = await new Promise<{ installed: boolean; message: string }>((resolve) => {
    exec('python -m demucs.separate --help', (error, stdout) => {
      if (stdout && stdout.includes('demucs')) {
        return resolve({ installed: true, message: 'Demucs AI Engine Ready' });
      }
      exec('demucs --help', (err2, out2) => {
        if (out2 && out2.includes('demucs')) {
          return resolve({ installed: true, message: 'Demucs AI Engine Ready' });
        }
        resolve({
          installed: false,
          message: 'Demucs is currently installing or missing. Run: python -m pip install demucs',
        });
      });
    });
  });

  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);

  return NextResponse.json({
    ffmpeg: {
      available: ffmpegAvailable,
      path: ffmpegPath,
    },
    demucs: {
      available: demucsStatus.installed,
      message: demucsStatus.message,
    },
    isVercel,
    isReady: ffmpegAvailable && demucsStatus.installed && !isVercel,
  });
}

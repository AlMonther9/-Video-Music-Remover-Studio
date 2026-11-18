import { NextResponse } from 'next/server';
import { getFFmpegExecutable } from '@/lib/ffmpeg-helper';
import { checkDemucsAvailability } from '@/lib/demucs-helper';
import fs from 'fs';

export async function GET() {
  const ffmpegPath = getFFmpegExecutable();
  const ffmpegAvailable = fs.existsSync(ffmpegPath) || ffmpegPath === 'ffmpeg';

  const demucsStatus = await checkDemucsAvailability();

  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);

  return NextResponse.json({
    ffmpeg: {
      available: ffmpegAvailable,
      path: ffmpegPath,
    },
    demucs: {
      available: demucsStatus.installed,
      message: demucsStatus.installed
        ? `Demucs AI Engine Ready (${demucsStatus.command || demucsStatus.version || 'Active'})`
        : demucsStatus.error || 'Demucs is missing. Run: pip install demucs',
    },
    isVercel,
    isReady: ffmpegAvailable && demucsStatus.installed && !isVercel,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { createJob, updateJob } from '@/lib/job-store';
import { extractAudioFromVideo, combineVideoAndAudio } from '@/lib/ffmpeg-helper';
import { separateStemsWithDemucs } from '@/lib/demucs-helper';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const videoFile = formData.get('video') as File | null;
    const mode = (formData.get('mode') as 'remove_music' | 'remove_vocals' | 'separate_all') || 'remove_music';
    const modelName = (formData.get('modelName') as string) || 'htdemucs';

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const processedDir = path.join(process.cwd(), 'public', 'processed');
    const tempDir = path.join(process.cwd(), 'temp', jobId);

    // Ensure directory existence
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const fileExtension = path.extname(videoFile.name) || '.mp4';
    const originalVideoPath = path.join(uploadsDir, `${jobId}_original${fileExtension}`);
    const originalVideoUrl = `/uploads/${jobId}_original${fileExtension}`;

    // Convert file object to Buffer and save
    const bytes = await videoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(originalVideoPath, buffer);

    // Create job record
    const job = createJob({
      id: jobId,
      originalFilename: videoFile.name,
      fileSize: videoFile.size,
      mode,
      modelName,
      videoUrl: originalVideoUrl,
    });

    // Start background processing pipeline (non-blocking)
    runProcessingPipeline(jobId, originalVideoPath, tempDir, processedDir, mode, modelName, fileExtension);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      job,
    });
  } catch (error: any) {
    console.error('Upload processing error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process upload' }, { status: 500 });
  }
}

async function runProcessingPipeline(
  jobId: string,
  originalVideoPath: string,
  tempDir: string,
  processedDir: string,
  mode: 'remove_music' | 'remove_vocals' | 'separate_all',
  modelName: string,
  fileExtension: string
) {
  try {
    // Step 1: Extract Audio
    updateJob(jobId, {
      status: 'extracting_audio',
      progress: 15,
      stepMessage: 'Extracting high-fidelity audio track via FFmpeg...',
    });

    const extractedWavPath = path.join(tempDir, 'extracted_audio.wav');
    await extractAudioFromVideo(originalVideoPath, extractedWavPath);

    // Step 2: Demucs Stem Separation
    updateJob(jobId, {
      status: 'separating_stems',
      progress: 25,
      stepMessage: `Launching Demucs AI Neural Model (${modelName})...`,
    });

    const outputDemucsDir = path.join(tempDir, 'demucs_output');
    const { primaryStemPath } = await separateStemsWithDemucs(
      extractedWavPath,
      outputDemucsDir,
      mode,
      modelName,
      (progressPercent, logMessage) => {
        updateJob(jobId, {
          progress: progressPercent,
          stepMessage: logMessage,
        });
      }
    );

    // Copy isolated audio to public directory so user can listen to isolated track
    const isolatedAudioFilename = `${jobId}_isolated.wav`;
    const publicIsolatedAudioPath = path.join(processedDir, isolatedAudioFilename);
    fs.copyFileSync(primaryStemPath, publicIsolatedAudioPath);
    const isolatedAudioUrl = `/processed/${isolatedAudioFilename}`;

    // Step 3: Video Remuxing
    updateJob(jobId, {
      status: 'remuxing_video',
      progress: 88,
      stepMessage: 'Merging clean audio stream with original video stream...',
    });

    const cleanVideoFilename = `${jobId}_clean${fileExtension}`;
    const outputVideoPath = path.join(processedDir, cleanVideoFilename);
    await combineVideoAndAudio(originalVideoPath, primaryStemPath, outputVideoPath);
    const outputVideoUrl = `/processed/${cleanVideoFilename}`;

    // Step 4: Finalize
    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      stepMessage: 'Processing Complete! Ready to stream & download.',
      outputVideoUrl,
      isolatedAudioUrl,
      completedAt: Date.now(),
    });

    // Cleanup temp files after 5 minutes
    setTimeout(() => {
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (err) {
        console.error('Error cleaning up temp directory:', err);
      }
    }, 5 * 60 * 1000);

  } catch (err: any) {
    console.error(`Pipeline failure for job ${jobId}:`, err);
    updateJob(jobId, {
      status: 'failed',
      stepMessage: `Processing failed: ${err.message || 'Unknown error'}`,
      error: err.message || 'Processing failed',
    });
  }
}

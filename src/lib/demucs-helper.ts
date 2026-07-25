import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface SeparationProgressCallback {
  (progressPercent: number, logMessage: string): void;
}

/**
 * Checks if Demucs is installed in Python environment
 */
export async function checkDemucsAvailability(): Promise<{ installed: boolean; version?: string; error?: string }> {
  return new Promise((resolve) => {
    exec('python -m demucs.separate --help', (error, stdout, stderr) => {
      if (error && !stdout.includes('demucs')) {
        return resolve({ installed: false, error: stderr || error.message });
      }
      resolve({ installed: true, version: 'HTDemucs v4' });
    });
  });
}

/**
 * Runs Demucs stem separation on input WAV file
 */
export async function separateStemsWithDemucs(
  inputWavPath: string,
  outputDir: string,
  mode: 'remove_music' | 'remove_vocals' | 'separate_all',
  modelName: string = 'htdemucs',
  onProgress?: SeparationProgressCallback
): Promise<{ primaryStemPath: string; allStems: Record<string, string> }> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filenameWithoutExt = path.basename(inputWavPath, path.extname(inputWavPath));
  
  const args = [
    '-m',
    'demucs.separate',
    '-n',
    modelName,
    '-o',
    outputDir,
  ];

  if (mode === 'remove_music') {
    // Isolate vocals (removes background music)
    args.push('--two-stems=vocals');
  } else if (mode === 'remove_vocals') {
    // Keep instrumental/music (removes speech/vocals)
    args.push('--two-stems=other');
  }

  args.push(inputWavPath);

  return new Promise((resolve, reject) => {
    console.log(`Starting Demucs: python ${args.join(' ')}`);
    
    if (onProgress) onProgress(10, 'Initializing AI neural model (PyTorch)...');

    const pyProcess = spawn('python', args, {
      env: process.env,
    });

    let errorOutput = '';

    pyProcess.stdout.on('data', (data) => {
      const log = data.toString();
      console.log('[Demucs Stdout]:', log);
      
      // Parse progress percentage if present (e.g. 45%|████▍     |)
      const match = log.match(/(\d+)%/);
      if (match && onProgress) {
        const percent = parseInt(match[1], 10);
        // Map Demucs progress (0-100) to job progress range (20 - 85)
        const mappedPercent = Math.min(85, Math.max(20, 20 + Math.round(percent * 0.65)));
        onProgress(mappedPercent, `AI Audio Separation: ${percent}% completed`);
      }
    });

    pyProcess.stderr.on('data', (data) => {
      const log = data.toString();
      errorOutput += log;
      console.log('[Demucs Log]:', log);

      const match = log.match(/(\d+)%/);
      if (match && onProgress) {
        const percent = parseInt(match[1], 10);
        const mappedPercent = Math.min(85, Math.max(20, 20 + Math.round(percent * 0.65)));
        onProgress(mappedPercent, `Processing audio frames: ${percent}%`);
      }
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Demucs exited with code ${code}. Error logs:\n${errorOutput}`);
        return reject(new Error(`Demucs AI process failed with code ${code}. ${errorOutput.slice(-300)}`));
      }

      if (onProgress) onProgress(85, 'Stem separation complete! Locating audio files...');

      // Find output directory created by Demucs
      // Demucs saves files under: <outputDir>/<modelName>/<filenameWithoutExt>/
      const targetSubfolder = path.join(outputDir, modelName, filenameWithoutExt);
      
      if (!fs.existsSync(targetSubfolder)) {
        return reject(new Error(`Expected Demucs output folder not found at ${targetSubfolder}`));
      }

      const files = fs.readdirSync(targetSubfolder);
      const allStems: Record<string, string> = {};

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.wav' || ext === '.flac' || ext === '.mp3') {
          const stemName = path.basename(file, ext);
          allStems[stemName] = path.join(targetSubfolder, file);
        }
      }

      let primaryStemPath = '';

      if (mode === 'remove_music') {
        // We want vocals.wav
        primaryStemPath = allStems['vocals'] || Object.values(allStems)[0];
      } else if (mode === 'remove_vocals') {
        // We want no_vocals.wav or other.wav
        primaryStemPath = allStems['no_vocals'] || allStems['other'] || Object.values(allStems)[0];
      } else {
        primaryStemPath = allStems['vocals'] || Object.values(allStems)[0];
      }

      if (!primaryStemPath || !fs.existsSync(primaryStemPath)) {
        return reject(new Error(`Could not locate generated audio stem file in ${targetSubfolder}`));
      }

      resolve({ primaryStemPath, allStems });
    });

    pyProcess.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

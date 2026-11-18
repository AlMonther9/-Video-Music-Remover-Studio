import { spawn, execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface SeparationProgressCallback {
  (progressPercent: number, logMessage: string): void;
}

export interface DemucsRunner {
  command: string;
  argsPrefix: string[];
  description: string;
}

let cachedRunner: DemucsRunner | null = null;

/**
 * Returns candidate Python/Demucs runners across system and user environments
 */
function getCandidateRunners(): DemucsRunner[] {
  const candidates: DemucsRunner[] = [];

  // 1. Explicit environment variables
  const envPython = process.env.DEMUCS_PYTHON || process.env.PYTHON_PATH || process.env.PYTHON_BIN;
  if (envPython && fs.existsSync(envPython)) {
    candidates.push({
      command: envPython,
      argsPrefix: ['-m', 'demucs.separate'],
      description: `Environment variable (${envPython})`,
    });
  }

  // 2. Local virtual environments
  const cwd = process.cwd();
  const venvs = [
    path.join(cwd, '.venv', 'Scripts', 'python.exe'),
    path.join(cwd, 'venv', 'Scripts', 'python.exe'),
    path.join(cwd, '.venv', 'bin', 'python'),
    path.join(cwd, 'venv', 'bin', 'python'),
  ];
  for (const venv of venvs) {
    if (fs.existsSync(venv)) {
      candidates.push({
        command: venv,
        argsPrefix: ['-m', 'demucs.separate'],
        description: `Virtualenv (${venv})`,
      });
    }
  }

  // 3. User AppData Python installations (common on Windows)
  const localAppData = process.env.LOCALAPPDATA || '';
  if (localAppData) {
    const versions = ['Python310', 'Python311', 'Python312', 'Python39'];
    for (const ver of versions) {
      const pyExe = path.join(localAppData, 'Programs', 'Python', ver, 'python.exe');
      if (fs.existsSync(pyExe)) {
        candidates.push({
          command: pyExe,
          argsPrefix: ['-m', 'demucs.separate'],
          description: `${ver} (${pyExe})`,
        });
      }

      const demucsExe = path.join(localAppData, 'Programs', 'Python', ver, 'Scripts', 'demucs.exe');
      if (fs.existsSync(demucsExe)) {
        candidates.push({
          command: demucsExe,
          argsPrefix: [],
          description: `Demucs CLI in ${ver} (${demucsExe})`,
        });
      }
    }
  }

  // 4. Windows py launcher with specific versions
  candidates.push(
    { command: 'py', argsPrefix: ['-3.10', '-m', 'demucs.separate'], description: 'py -3.10 launcher' },
    { command: 'py', argsPrefix: ['-3.11', '-m', 'demucs.separate'], description: 'py -3.11 launcher' },
    { command: 'py', argsPrefix: ['-3.12', '-m', 'demucs.separate'], description: 'py -3.12 launcher' }
  );

  // 5. Global Windows Python paths
  const globalDirs = [
    'C:\\Python310',
    'C:\\Python311',
    'C:\\Python312',
    'C:\\Program Files\\Python310',
    'C:\\Program Files\\Python311',
    'C:\\Program Files\\Python312',
  ];
  for (const gDir of globalDirs) {
    const p = path.join(gDir, 'python.exe');
    if (fs.existsSync(p)) {
      candidates.push({
        command: p,
        argsPrefix: ['-m', 'demucs.separate'],
        description: `Global Python (${p})`,
      });
    }
  }

  // 6. Direct system PATH commands
  candidates.push(
    { command: 'demucs', argsPrefix: [], description: 'demucs (in PATH)' },
    { command: 'python', argsPrefix: ['-m', 'demucs.separate'], description: 'python (in PATH)' },
    { command: 'python3', argsPrefix: ['-m', 'demucs.separate'], description: 'python3 (in PATH)' },
    { command: 'py', argsPrefix: ['-m', 'demucs.separate'], description: 'py launcher default' }
  );

  return candidates;
}

/**
 * Tests whether a candidate runner has demucs working
 */
async function testRunner(runner: DemucsRunner): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      execFile(
        runner.command,
        [...runner.argsPrefix, '--help'],
        { timeout: 7000 },
        (error, stdout) => {
          if (!error && (stdout.includes('demucs') || stdout.includes('usage: demucs'))) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      );
    } catch {
      resolve(false);
    }
  });
}

/**
 * Resolves the working Python/Demucs runner and caches it
 */
export async function resolveDemucsRunner(): Promise<DemucsRunner> {
  if (cachedRunner) {
    return cachedRunner;
  }

  const candidates = getCandidateRunners();
  for (const candidate of candidates) {
    const isWorking = await testRunner(candidate);
    if (isWorking) {
      console.log(`[Demucs Helper] Resolved working Demucs runner: ${candidate.description}`);
      cachedRunner = candidate;
      return candidate;
    }
  }

  throw new Error(
    'Demucs is not found or failed to initialize in any Python environment. ' +
    'Please verify that Demucs is installed (e.g. `pip install demucs`) or set PYTHON_PATH in .env.local to your Python executable.'
  );
}

/**
 * Checks if Demucs is installed and ready
 */
export async function checkDemucsAvailability(): Promise<{
  installed: boolean;
  version?: string;
  command?: string;
  error?: string;
}> {
  try {
    const runner = await resolveDemucsRunner();
    return {
      installed: true,
      version: 'HTDemucs v4',
      command: runner.description,
    };
  } catch (error: any) {
    return {
      installed: false,
      error: error.message || 'Demucs not found',
    };
  }
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

  const runner = await resolveDemucsRunner();
  const filenameWithoutExt = path.basename(inputWavPath, path.extname(inputWavPath));

  const args = [
    ...runner.argsPrefix,
    '-n',
    modelName,
    '-o',
    outputDir,
  ];

  if (mode === 'remove_music' || mode === 'remove_vocals') {
    // Isolate vocals vs non-vocals (instrumentals/music)
    args.push('--two-stems=vocals');
  }

  args.push(inputWavPath);

  return new Promise((resolve, reject) => {
    console.log(`Starting Demucs: ${runner.command} ${args.join(' ')}`);

    if (onProgress) onProgress(10, 'Initializing AI neural model (PyTorch)...');

    const pyProcess = spawn(runner.command, args, {
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
      let targetSubfolder = path.join(outputDir, modelName, filenameWithoutExt);

      if (!fs.existsSync(targetSubfolder)) {
        // Fallback: check inside outputDir/modelName for any generated folder
        const modelDir = path.join(outputDir, modelName);
        if (fs.existsSync(modelDir)) {
          const subdirs = fs.readdirSync(modelDir).filter((f) => fs.statSync(path.join(modelDir, f)).isDirectory());
          if (subdirs.length > 0) {
            targetSubfolder = path.join(modelDir, subdirs[0]);
          }
        }
      }

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
      reject(new Error(`Failed to start Demucs process (${runner.command}): ${err.message}`));
    });
  });
}

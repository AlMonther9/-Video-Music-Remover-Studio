export interface ProcessingJob {
  id: string;
  originalFilename: string;
  fileSize: number;
  mode: 'remove_music' | 'remove_vocals' | 'separate_all';
  modelName: string;
  status: 'queued' | 'extracting_audio' | 'separating_stems' | 'remuxing_video' | 'completed' | 'failed';
  progress: number; // 0 to 100
  stepMessage: string;
  videoUrl?: string;
  outputVideoUrl?: string;
  isolatedAudioUrl?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

// In-memory store for local processing jobs
const jobsMap = new Map<string, ProcessingJob>();

export function createJob(data: Omit<ProcessingJob, 'createdAt' | 'status' | 'progress' | 'stepMessage'>): ProcessingJob {
  const job: ProcessingJob = {
    ...data,
    status: 'queued',
    progress: 5,
    stepMessage: 'Job queued...',
    createdAt: Date.now(),
  };
  jobsMap.set(job.id, job);
  return job;
}

export function updateJob(id: string, updates: Partial<ProcessingJob>): ProcessingJob | undefined {
  const existing = jobsMap.get(id);
  if (!existing) return undefined;
  
  const updated = { ...existing, ...updates };
  jobsMap.set(id, updated);
  return updated;
}

export function getJob(id: string): ProcessingJob | undefined {
  return jobsMap.get(id);
}

export function getAllJobs(): ProcessingJob[] {
  return Array.from(jobsMap.values()).sort((a, b) => b.createdAt - a.createdAt);
}

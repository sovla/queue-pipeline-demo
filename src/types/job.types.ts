export interface PipelineJobData {
  id: string;
  batchId: string;
  payload: {
    targetUrl: string;
    method: 'GET' | 'POST';
    body?: Record<string, unknown>;
    authToken?: string;
  };
  attempt: number;
  maxAttempts: number;
  createdAt: string;
}

export interface PipelineResult {
  id: string;
  status: 'completed' | 'failed' | 'dead_letter';
  data?: unknown;
  error?: string;
  processedAt: string;
}

export interface BatchProgress {
  batchId: string;
  total: number;
  completed: number;
  failed: number;
  deadLetter: number;
  startedAt: string;
}

export const QUEUE_NAMES = {
  FILTER: 'pipeline:filter',
  AUTH: 'pipeline:auth',
  REQUEST: 'pipeline:request',
  RESPONSE: 'pipeline:response',
  DEAD_LETTER: 'pipeline:dead-letter',
} as const;

export const PIPELINE_CONFIG = {
  MAX_ATTEMPTS: 3,
  RATE_LIMIT_TPS: 30,
  CIRCUIT_BREAKER_THRESHOLD: 5,
  CIRCUIT_BREAKER_RESET_MS: 60_000,
} as const;

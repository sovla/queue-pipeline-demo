/**
 * Batch Progress Tracker (In-Memory)
 *
 * ⚠️ Demo Limitation: Uses in-memory Map. Lost on process restart.
 * Production: Replace with Redis HSET for durability across restarts.
 * Example: await redis.hset(`batch:${batchId}`, 'completed', String(count));
 */
import { Injectable, Logger } from '@nestjs/common';
import { BatchProgress } from '../types/job.types';

@Injectable()
export class PipelineProgressService {
  private readonly logger = new Logger(PipelineProgressService.name);
  private readonly batches = new Map<string, BatchProgress>();

  createBatch(batchId: string, total: number): BatchProgress {
    const batch: BatchProgress = {
      batchId,
      total,
      completed: 0,
      failed: 0,
      deadLetter: 0,
      startedAt: new Date().toISOString(),
    };
    this.batches.set(batchId, batch);
    return batch;
  }

  async recordCompleted(batchId: string, result: unknown): Promise<void> {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    batch.completed++;
    this.logProgress(batch);
  }

  async recordFailed(batchId: string): Promise<void> {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    batch.failed++;
    this.logProgress(batch);
  }

  async recordDeadLetter(batchId: string, info: { jobId: string; error: string }): Promise<void> {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    batch.deadLetter++;
    this.logProgress(batch);
  }

  getProgress(batchId: string): BatchProgress | undefined {
    return this.batches.get(batchId);
  }

  private logProgress(batch: BatchProgress): void {
    const processed = batch.completed + batch.failed + batch.deadLetter;
    const pct = Math.round((processed / batch.total) * 100);
    this.logger.log(
      `[Batch ${batch.batchId}] ${pct}% (${processed}/${batch.total}) — ` +
      `OK:${batch.completed} FAIL:${batch.failed} DLQ:${batch.deadLetter}`,
    );
  }
}

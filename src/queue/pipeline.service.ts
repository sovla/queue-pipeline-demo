import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { QUEUE_NAMES, PIPELINE_CONFIG, PipelineJobData } from '../types/job.types';
import { PipelineProgressService } from './pipeline-progress.service';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.FILTER) private readonly filterQueue: Queue,
    private readonly progress: PipelineProgressService,
  ) {}

  async triggerBatch(count: number, targetUrl: string): Promise<{ batchId: string }> {
    const batchId = randomUUID();
    this.progress.createBatch(batchId, count);

    const jobs = Array.from({ length: count }, (_, i) => ({
      name: 'filter',
      data: {
        id: `${batchId}-${i}`,
        batchId,
        payload: {
          targetUrl,
          method: 'POST' as const,
          body: { index: i },
        },
        attempt: 1,
        maxAttempts: PIPELINE_CONFIG.MAX_ATTEMPTS,
        createdAt: new Date().toISOString(),
      } satisfies PipelineJobData,
    }));

    await this.filterQueue.addBulk(jobs);
    this.logger.log(`[Pipeline] Batch ${batchId} triggered: ${count} jobs`);

    return { batchId };
  }

  getProgress(batchId: string) {
    return this.progress.getProgress(batchId);
  }
}

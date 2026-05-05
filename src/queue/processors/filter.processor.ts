import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PipelineJobData, QUEUE_NAMES } from '../../types/job.types';
import { PipelineProgressService } from '../pipeline-progress.service';

@Processor(QUEUE_NAMES.FILTER)
export class FilterProcessor extends WorkerHost {
  private readonly logger = new Logger(FilterProcessor.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.AUTH) private readonly authQueue: Queue,
    private readonly progress: PipelineProgressService,
  ) {
    super();
  }

  async process(job: Job<PipelineJobData>): Promise<void> {
    const { id, batchId, payload } = job.data;

    if (!payload?.targetUrl || !payload?.method) {
      this.logger.warn(`[Filter] Job ${id} rejected: missing required fields`);
      await this.progress.recordFailed(batchId);
      return;
    }

    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(payload.targetUrl)) {
      this.logger.warn(`[Filter] Job ${id} rejected: invalid URL format`);
      await this.progress.recordFailed(batchId);
      return;
    }

    await this.authQueue.add('auth', job.data);
    this.logger.log(`[Filter] Job ${id} → auth queue`);
  }
}

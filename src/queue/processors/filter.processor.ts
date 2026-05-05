import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PipelineJobData, QUEUE_NAMES } from '../../types/job.types';

@Processor(QUEUE_NAMES.FILTER)
export class FilterProcessor extends WorkerHost {
  private readonly logger = new Logger(FilterProcessor.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.AUTH) private readonly authQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<PipelineJobData>): Promise<void> {
    const { id, payload } = job.data;

    if (!payload?.targetUrl || !payload?.method) {
      this.logger.warn(`[Filter] Job ${id} rejected: missing required fields`);
      return;
    }

    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(payload.targetUrl)) {
      this.logger.warn(`[Filter] Job ${id} rejected: invalid URL format`);
      return;
    }

    await this.authQueue.add('auth', job.data);
    this.logger.log(`[Filter] Job ${id} → auth queue`);
  }
}

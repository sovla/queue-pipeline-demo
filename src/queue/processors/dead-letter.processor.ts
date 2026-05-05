import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PipelineJobData, QUEUE_NAMES } from '../../types/job.types';
import { NotificationService } from '../../notification/notification.service';
import { PipelineProgressService } from '../pipeline-progress.service';

@Processor(QUEUE_NAMES.DEAD_LETTER)
export class DeadLetterProcessor extends WorkerHost {
  private readonly logger = new Logger(DeadLetterProcessor.name);

  constructor(
    private readonly notification: NotificationService,
    private readonly progress: PipelineProgressService,
  ) {
    super();
  }

  async process(job: Job<PipelineJobData>): Promise<void> {
    const { id, batchId, payload, maxAttempts } = job.data;
    const error = (payload as any).error || 'Unknown error';

    this.logger.error(
      `[DeadLetter] Job ${id} permanently failed after ${maxAttempts} attempts: ${error}`,
    );

    await this.progress.recordDeadLetter(batchId, { jobId: id, error });

    await this.notification.send({
      level: 'error',
      title: `Pipeline Job Failed: ${id}`,
      message: `Batch: ${batchId}\nAttempts: ${maxAttempts}\nError: ${error}`,
    });
  }
}

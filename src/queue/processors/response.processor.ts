import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PipelineJobData, QUEUE_NAMES } from '../../types/job.types';
import { PipelineProgressService } from '../pipeline-progress.service';

@Processor(QUEUE_NAMES.RESPONSE)
export class ResponseProcessor extends WorkerHost {
  private readonly logger = new Logger(ResponseProcessor.name);

  constructor(private readonly progress: PipelineProgressService) {
    super();
  }

  async process(job: Job<PipelineJobData>): Promise<void> {
    const { id, batchId, payload } = job.data;
    const response = payload.response;

    if (!response || response.statusCode !== 200) {
      this.logger.warn(`[Response] Job ${id} — invalid response structure`);
      await this.progress.recordFailed(batchId);
      return;
    }

    // 응답 정규화: 외부 API 비표준 응답을 내부 포맷으로 변환
    const normalized = {
      jobId: id,
      data: response.body,
      processedAt: new Date().toISOString(),
    };

    await this.progress.recordCompleted(batchId, normalized);
    this.logger.log(`[Response] Job ${id} completed`);
  }
}

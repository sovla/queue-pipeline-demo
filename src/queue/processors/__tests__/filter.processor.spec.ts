import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { FilterProcessor } from '../filter.processor';
import { PipelineProgressService } from '../../pipeline-progress.service';
import { QUEUE_NAMES, PipelineJobData } from '../../../types/job.types';

const mockAuthQueue = {
  add: jest.fn(),
};

const mockProgress = {
  recordFailed: jest.fn(),
};

const makeJob = (payload: Record<string, unknown>): { data: PipelineJobData } => ({
  data: {
    id: 'test-job-id',
    batchId: 'test-batch-id',
    payload: payload as PipelineJobData['payload'],
    attempt: 1,
    maxAttempts: 3,
    createdAt: new Date().toISOString(),
  },
});

describe('FilterProcessor', () => {
  let processor: FilterProcessor;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilterProcessor,
        {
          provide: getQueueToken(QUEUE_NAMES.AUTH),
          useValue: mockAuthQueue,
        },
        {
          provide: PipelineProgressService,
          useValue: mockProgress,
        },
      ],
    }).compile();

    processor = module.get<FilterProcessor>(FilterProcessor);
  });

  it('should pass valid jobs to auth queue', async () => {
    const job = makeJob({ targetUrl: 'https://api.example.gov/data', method: 'POST' });
    await processor.process(job as unknown as Job<PipelineJobData>);
    expect(mockAuthQueue.add).toHaveBeenCalledWith('auth', job.data);
  });

  it('should reject missing targetUrl', async () => {
    const job = makeJob({ method: 'GET' });
    await processor.process(job as unknown as Job<PipelineJobData>);
    expect(mockAuthQueue.add).not.toHaveBeenCalled();
  });

  it('should reject missing method', async () => {
    const job = makeJob({ targetUrl: 'https://api.example.gov/data' });
    await processor.process(job as unknown as Job<PipelineJobData>);
    expect(mockAuthQueue.add).not.toHaveBeenCalled();
  });

  it('should reject invalid URL format', async () => {
    const job = makeJob({ targetUrl: 'not-a-url', method: 'GET' });
    await processor.process(job as unknown as Job<PipelineJobData>);
    expect(mockAuthQueue.add).not.toHaveBeenCalled();
  });

  it('should accept https URLs', async () => {
    const job = makeJob({ targetUrl: 'https://secure.api.gov/endpoint', method: 'GET' });
    await processor.process(job as unknown as Job<PipelineJobData>);
    expect(mockAuthQueue.add).toHaveBeenCalledTimes(1);
  });

  it('should handle empty payload', async () => {
    const job = makeJob({});
    await processor.process(job as unknown as Job<PipelineJobData>);
    expect(mockAuthQueue.add).not.toHaveBeenCalled();
  });
});

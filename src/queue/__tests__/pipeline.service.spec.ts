import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { PipelineService } from '../pipeline.service';
import { PipelineProgressService } from '../pipeline-progress.service';
import { QUEUE_NAMES, PIPELINE_CONFIG } from '../../types/job.types';

const mockFilterQueue = {
  addBulk: jest.fn(),
};

const mockProgress = {
  createBatch: jest.fn(),
  getProgress: jest.fn(),
};

describe('PipelineService', () => {
  let service: PipelineService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineService,
        {
          provide: getQueueToken(QUEUE_NAMES.FILTER),
          useValue: mockFilterQueue,
        },
        {
          provide: PipelineProgressService,
          useValue: mockProgress,
        },
      ],
    }).compile();

    service = module.get<PipelineService>(PipelineService);
  });

  it('should create batch with UUID', async () => {
    mockFilterQueue.addBulk.mockResolvedValue([]);
    const result = await service.triggerBatch(5, 'https://api.example.gov');
    expect(result.batchId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('should add exactly count jobs to filter queue', async () => {
    mockFilterQueue.addBulk.mockResolvedValue([]);
    await service.triggerBatch(10, 'https://api.example.gov');
    const jobs = mockFilterQueue.addBulk.mock.calls[0][0];
    expect(jobs).toHaveLength(10);
  });

  it('should set attempt to 1 for all jobs', async () => {
    mockFilterQueue.addBulk.mockResolvedValue([]);
    await service.triggerBatch(3, 'https://api.example.gov');
    const jobs = mockFilterQueue.addBulk.mock.calls[0][0];
    for (const job of jobs) {
      expect(job.data.attempt).toBe(1);
    }
  });

  it('should set correct maxAttempts', async () => {
    mockFilterQueue.addBulk.mockResolvedValue([]);
    await service.triggerBatch(3, 'https://api.example.gov');
    const jobs = mockFilterQueue.addBulk.mock.calls[0][0];
    for (const job of jobs) {
      expect(job.data.maxAttempts).toBe(PIPELINE_CONFIG.MAX_ATTEMPTS);
    }
  });
});

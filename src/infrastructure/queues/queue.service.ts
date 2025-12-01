import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

import type { Env } from '../../config/env.js';
import type { Logger } from '../logging/logger.js';
import type { RedisInstance } from '../cache/redis.client.js';

export interface AlertJobData {
  alertId: string;
  groupId: string;
  userId: string;
  message: string;
}

export interface ReportJobData {
  type: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
}

export class QueueService {
  private readonly alertQueue: Queue<AlertJobData>;
  private readonly reportQueue: Queue<ReportJobData>;
  private readonly alertEvents: QueueEvents;
  private readonly reportEvents: QueueEvents;
  private readonly redisConnection: RedisInstance;

  constructor(
    private readonly env: Env,
    private readonly logger: Logger,
  ) {
    const redisUrl = this.env.REDIS_URL ?? 'redis://localhost:6379';

    this.redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      db: this.env.REDIS_DB,
    });

    this.alertQueue = new Queue<AlertJobData>('alerts', { connection: this.redisConnection });
    this.reportQueue = new Queue<ReportJobData>('reports', { connection: this.redisConnection });

    this.alertEvents = new QueueEvents('alerts', { connection: this.redisConnection });
    this.reportEvents = new QueueEvents('reports', { connection: this.redisConnection });

    this.logger.info('BullMQ Queues initialized');
  }

  async shutdown(): Promise<void> {
    await this.alertQueue.close();
    await this.reportQueue.close();
    await this.alertEvents.close();
    await this.reportEvents.close();
    await this.redisConnection.quit();
    this.logger.info('BullMQ Queues closed');
  }

  async addAlertJob(data: AlertJobData, repeatMs?: number): Promise<string> {
    const job = await this.alertQueue.add('send-alert', data, {
      repeat: repeatMs ? { every: repeatMs } : undefined,
      removeOnComplete: true,
      removeOnFail: 100,
    });
    this.logger.debug({ jobId: job.id }, 'Alert job added');
    return job.id ?? '';
  }

  async removeAlertJob(jobId: string): Promise<void> {
    const job = await this.alertQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.debug({ jobId }, 'Alert job removed');
    }
  }

  async addReportJob(data: ReportJobData): Promise<string> {
    const job = await this.reportQueue.add('generate-report', data, {
      removeOnComplete: true,
      removeOnFail: 10,
    });
    this.logger.debug({ jobId: job.id }, 'Report job added');
    return job.id ?? '';
  }

  async scheduleWeeklyReport(cronExpression: string): Promise<void> {
    await this.reportQueue.add(
      'weekly-report',
      { type: 'weekly', startDate: '', endDate: '' },
      {
        repeat: { pattern: cronExpression },
        removeOnComplete: true,
      },
    );
    this.logger.info({ cron: cronExpression }, 'Weekly report scheduled');
  }

  getAlertQueue(): Queue<AlertJobData> {
    return this.alertQueue;
  }

  getReportQueue(): Queue<ReportJobData> {
    return this.reportQueue;
  }
}

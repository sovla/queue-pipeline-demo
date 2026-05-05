import { Injectable, Logger } from '@nestjs/common';

interface NotificationPayload {
  level: 'info' | 'warn' | 'error';
  title: string;
  message: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async send(payload: NotificationPayload): Promise<void> {
    // 실제: Google Chat / Slack Webhook 호출
    // const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
    // await fetch(webhookUrl, { method: 'POST', body: JSON.stringify(payload) });

    this.logger.warn(`[Notification] ${payload.level.toUpperCase()}: ${payload.title}`);
    this.logger.warn(`  → ${payload.message}`);
  }
}

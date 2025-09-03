import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { LearningSession, LearningSessionDocument } from '../common/schemas/learning-session.schema';
import { XpTransaction, XpTransactionDocument } from '../common/schemas/xp-transaction.schema';

@Injectable()
export class SessionCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionCleanupService.name);
  private intervalHandle?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(LearningSession.name) private readonly sessionModel: Model<LearningSessionDocument>,
    @InjectModel(XpTransaction.name) private readonly xpModel: Model<XpTransactionDocument>,
  ) {}

  onModuleInit() {
    const intervalMs = Number(this.config.get('PROGRESS_CLEANUP_INTERVAL_MS') || 60_000);
    // run soon after start
    setTimeout(() => this.closeStaleSessions().catch(() => {}), 5_000);
    this.intervalHandle = setInterval(() => this.closeStaleSessions().catch(() => {}), intervalMs);
    this.logger.log(`Session cleanup scheduled every ${intervalMs} ms`);
  }

  onModuleDestroy() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
  }

  private getTtlMs(): number {
    const ttlMinutes = Number(this.config.get('PROGRESS_SESSION_TTL_MINUTES') || 30);
    return ttlMinutes * 60_000;
  }

  async closeStaleSessions() {
    const ttlMs = this.getTtlMs();
    const cutoff = new Date(Date.now() - ttlMs);

    const stale = await this.sessionModel
      .find({ $or: [{ endedAt: null }, { endedAt: { $exists: false } }], startedAt: { $lt: cutoff } })
      .limit(200)
      .lean();

    if (!stale.length) return;

    const now = new Date();
    let closed = 0;

    for (const s of stale) {
      try {
        // Sum XP for this session if available
        const items = await this.xpModel
          .aggregate([
            { $match: { userId: s.userId, sessionId: String((s as any)._id) } },
            { $group: { _id: null, total: { $sum: '$delta' } } },
          ])
          .exec();
        const xp = items[0]?.total || 0;
        await this.sessionModel.updateOne({ _id: (s as any)._id }, { $set: { endedAt: now, xpEarned: xp } }).exec();
        closed++;
      } catch (e) {
        // log and continue
        this.logger.warn(`Failed to close session ${(s as any)._id}: ${(e as Error).message}`);
      }
    }

    this.logger.log(`Closed ${closed} stale sessions`);
  }
}



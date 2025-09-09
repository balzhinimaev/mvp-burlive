import { Body, Controller, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead, LeadDocument } from '../common/schemas/lead.schema';

@Controller('leads')
export class LeadsController {
  constructor(@InjectModel(Lead.name) private readonly leadModel: Model<LeadDocument>) {}

  @Post('bot_start')
  async botStart(
    @Body()
    body: {
      userId: string;
      utm?: Record<string, string>;
      promoId?: string;
    },
  ) {
    const { userId, utm, promoId } = body;
    if (utm && Object.keys(utm).length) {
      await this.leadModel.updateOne(
        { userId },
        {
          $setOnInsert: { userId, firstUtm: utm, botStartedAt: new Date() },
          $set: { lastUtm: utm, ...(promoId ? { promoId } : {}) },
        },
        { upsert: true },
      );
    } else {
      await this.leadModel.updateOne(
        { userId },
        { $setOnInsert: { userId, botStartedAt: new Date() }, ...(promoId ? { $set: { promoId } } : {}) },
        { upsert: true },
      );
    }
    return { ok: true };
  }
}



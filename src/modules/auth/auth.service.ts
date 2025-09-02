import * as crypto from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user.schema';
import { AppEvent, EventDocument } from '../common/schemas/event.schema';

export interface TelegramInitData {
  query_id?: string;
  user?: string;
  auth_date?: string;
  hash: string;
  start_param?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(AppEvent.name) private readonly eventModel: Model<EventDocument>,
  ) {}
  async verifyTelegramInitData(initData: URLSearchParams): Promise<{ userId: number; utm?: Record<string, string> }> {
    const hash = initData.get('hash') || '';
    const dataCheckString = Array.from(initData.entries())
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const token = process.env.TELEGRAM_BOT_TOKEN || '';
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (computedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram init data signature');
    }

    const userParam = initData.get('user');
    if (!userParam) {
      throw new UnauthorizedException('Missing user');
    }
    const user = JSON.parse(userParam) as {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      photo_url?: string;
    };

    const utm: Record<string, string> = {};
    const startParam = initData.get('start_param');
    if (startParam) {
      // Expected format: utm_source=vk&utm_campaign=xyz
      for (const kv of startParam.split('&')) {
        const [k, v] = kv.split('=');
        if (k && v) utm[k] = v;
      }
    }

    const userId = user.id;
    const profile: Record<string, any> = {};
    if (user.first_name) profile.firstName = user.first_name;
    if (user.last_name) profile.lastName = user.last_name;
    if (user.username) profile.username = user.username;
    if (user.language_code) profile.languageCode = user.language_code;
    if (user.photo_url) profile.photoUrl = user.photo_url;

    if (Object.keys(utm).length) {
      await this.userModel.updateOne(
        { userId },
        {
          $setOnInsert: { firstUtm: utm, userId },
          $set: { lastUtm: utm, ...profile },
        },
        { upsert: true },
      );
    } else {
      await this.userModel.updateOne(
        { userId },
        { $setOnInsert: { firstUtm: {}, userId }, $set: { ...profile } },
        { upsert: true },
      );
    }

    await this.eventModel.create({ userId, name: 'open_app', ts: new Date(), properties: { ...utm } });
    return { userId, utm: Object.keys(utm).length ? utm : undefined };
  }
}



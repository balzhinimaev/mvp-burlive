import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.query?.userId || request.body?.userId || request.params?.userId;

    // 🔒 БАЗОВАЯ ВАЛИДАЦИЯ
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    if (typeof userId !== 'string' || userId.length < 5 || userId.length > 20) {
      throw new BadRequestException('Invalid userId format');
    }

    // 🔒 ПРОВЕРКА СУЩЕСТВОВАНИЯ ПОЛЬЗОВАТЕЛЯ
    const user = await this.userModel.findOne({ userId: String(userId) }).lean();
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 🔒 ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: логирование подозрительной активности
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const userAgent = request.headers?.['user-agent'] || 'unknown';
    
    // В продакшене добавить в Redis/лог для мониторинга
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUTH] userId=${userId}, ip=${ip}, ua=${userAgent.substring(0, 50)}`);
    }

    // Добавляем user в request для использования в контроллерах
    request.user = user;
    return true;
  }
}

import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user.schema';

@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.query?.userId || request.body?.userId || request.params?.userId;

    if (!userId) {
      // Для защищенных endpoints userId обязателен
      throw new BadRequestException('userId is required');
    }

    const user = await this.userModel.findOne({ userId: Number(userId) }).lean();

    if (!user) {
      // Если пользователь не найден, пропускаем (авторизация обработает это)
      return true;
    }

    // Проверяем, заполнил ли пользователь анкету
    const hasCompletedOnboarding = Boolean(user.onboardingCompletedAt);

    if (!hasCompletedOnboarding) {
      // Вместо блокировки доступа, добавляем информацию в запрос
      // чтобы контроллер мог обработать это соответствующим образом
      request.onboardingRequired = true;
      request.onboardingCompleted = false;
      return true;
    }

    request.onboardingRequired = false;
    request.onboardingCompleted = true;
    return true;
  }
}

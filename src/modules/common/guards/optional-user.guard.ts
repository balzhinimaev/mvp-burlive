import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class OptionalUserGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.query?.userId || request.body?.userId || request.params?.userId;

    // If userId is not provided, allow anonymous access
    if (!userId) {
      return true;
    }

    if (typeof userId !== 'string' || userId.length < 5 || userId.length > 20) {
      throw new BadRequestException('Invalid userId format');
    }

    const user = await this.userModel.findOne({ userId: String(userId) }).lean();
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request.user = user;
    return true;
  }
}



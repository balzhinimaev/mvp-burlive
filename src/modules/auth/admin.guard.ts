import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user.schema';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Get userId from JWT token (set by JwtAuthGuard)
    const userId = request.user?.userId;
    
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check if user exists and has admin privileges
    const user = await this.userModel.findOne({ userId: String(userId) }).lean();
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user is admin
    if (!user.isAdmin) {
      throw new ForbiddenException('Admin privileges required');
    }

    // Add user info to request for use in controllers
    request.adminUser = user;
    return true;
  }
}

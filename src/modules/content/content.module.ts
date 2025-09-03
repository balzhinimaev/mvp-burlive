import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ContentController],
})
export class ContentModule {}



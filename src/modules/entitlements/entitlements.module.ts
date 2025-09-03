import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Entitlement, EntitlementSchema } from '../common/schemas/entitlement.schema';
import { EntitlementsService } from './entitlements.service';
import { EntitlementsController } from './entitlements.controller';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../common/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Entitlement.name, schema: EntitlementSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
  ],
  providers: [EntitlementsService],
  controllers: [EntitlementsController],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}



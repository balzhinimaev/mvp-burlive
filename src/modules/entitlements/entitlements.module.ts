import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Entitlement, EntitlementSchema } from '../common/schemas/entitlement.schema';
import { EntitlementsService } from './entitlements.service';
import { EntitlementsController } from './entitlements.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Entitlement.name, schema: EntitlementSchema }])],
  providers: [EntitlementsService],
  controllers: [EntitlementsController],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}



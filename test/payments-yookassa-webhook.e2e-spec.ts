import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('YooKassa Webhook (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('should create entitlement on payment.succeeded and be idempotent', async () => {
    const idem = 'idem-key-1';
    const userId = 'e2e-user-1';

    // First call
    const res1 = await request(app.getHttpServer())
      .post('/api/v2/payments/webhook/yookassa')
      .set('Idempotence-Key', idem)
      .send({
        event: 'payment.succeeded',
        object: {
          id: 'pmt_1',
          amount: { value: '79.00', currency: 'RUB' },
          metadata: { userId, product: 'monthly' },
        },
      });
    expect(res1.status).toBe(200);

    // Second call with same idempotence key should be idempotent
    const res2 = await request(app.getHttpServer())
      .post('/api/v2/payments/webhook/yookassa')
      .set('Idempotence-Key', idem)
      .send({
        event: 'payment.succeeded',
        object: {
          id: 'pmt_1',
          amount: { value: '79.00', currency: 'RUB' },
          metadata: { userId, product: 'monthly' },
        },
      });
    expect(res2.status).toBe(200);

    // Check entitlement created
    const db: any = app.get('DatabaseConnection');
    const ent = await db.collection('entitlements').findOne({ userId, product: 'monthly' });
    expect(ent).toBeTruthy();
    expect(new Date(ent.endsAt).getTime()).toBeGreaterThan(new Date(ent.startsAt).getTime());
  });
});



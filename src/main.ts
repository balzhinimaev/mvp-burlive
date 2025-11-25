import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Swagger is optional in local dev; load dynamically to avoid hard dependency during lint

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: true });
  const configService = app.get(ConfigService);
  
  // Set global prefix for all routes
  // app.setGlobalPrefix('api/v2'); // Disabled - nginx strips the prefix
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger (basic)
  try {
    const moduleName = '@nestjs/swagger';
    const dynamicImport: any = (eval('import'));
    const swagger = await dynamicImport(moduleName);
    const DocumentBuilder = (swagger as any).DocumentBuilder;
    const SwaggerModule = (swagger as any).SwaggerModule;
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Burlive API')
      .setVersion('2.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  } catch (e) {
    // noop if swagger is not installed
  }

  const port = configService.get<number>('app.port', 7777);
  await app.listen(port);
}

bootstrap();



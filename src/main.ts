import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const port = parseInt(process.env.APP_PORT || '3000', 10);
  const host = process.env.APP_HOST || 'localhost';
  const env = process.env.NODE_ENV || 'development';

  const prodHost = process.env.APP_HOST_PROD || 'api.production.com';
  const prodPort = process.env.APP_PORT_PROD || '443';

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sales API')
    .setDescription('API untuk sistem penjualan dan bundle product')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'Masukkan JWT token',
      in: 'header',
    })
    // .addServer('https://e124-103-189-116-14.ngrok-free.app')
    .addServer(`http://${host}:${port}`, 'Development') // 🟢 Local dev
    .addServer(`http://${prodHost}:${prodPort}`, 'Production') // 🟡 Production
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  console.log(`🚀 App running on http://${host}:${port}`);
  console.log(`📘 Swagger: http://${host}:${port}/api`);
}
bootstrap();

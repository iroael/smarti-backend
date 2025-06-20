import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ✅ Aktifkan CORS agar frontend bisa akses API
  app.enableCors({
    origin: 'http://103.158.130.3:3000/', // frontend origin
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const config = new DocumentBuilder()
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
    .build();

  const document = SwaggerModule.createDocument(app, config); // ✅ tambahkan ini
  SwaggerModule.setup('api', app, document); // setup Swagger

  const port = parseInt(process.env.APP_PORT || '3000', 10);
  await app.listen(port);
  console.log(`🚀 App running on http://localhost:${port}/api`);
}
bootstrap();

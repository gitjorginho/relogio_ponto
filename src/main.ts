import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule, ObserveInstrument } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN === '*' ? '*' : (process.env.CORS_ORIGIN?.split(',').map((item) => item.trim()) ?? '*'),
    credentials: process.env.CORS_ORIGIN !== '*',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Sistema de Relógio de Ponto')
    .setDescription(
      'API REST para controle de ponto eletrônico com autenticação JWT, jornadas, batimentos, relatórios e exportação CSV.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Autenticação')
    .addTag('Funcionários')
    .addTag('Jornada de trabalho')
    .addTag('Registro de ponto')
    .addTag('Relatórios')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

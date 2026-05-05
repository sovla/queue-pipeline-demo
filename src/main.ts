import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  const port = process.env.PORT || 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`Pipeline running on http://localhost:${port}`);
}
bootstrap();

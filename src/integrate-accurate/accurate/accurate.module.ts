import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AccurateController } from './accurate.controller';
import { AccurateService } from './accurate.service';

@Module({
  imports: [HttpModule],
  controllers: [AccurateController],
  providers: [AccurateService],
  exports: [AccurateService],
})
export class AccurateModule {}

import { Module } from '@nestjs/common';
import { TimeRecordsController } from './time-records.controller';
import { TimeRecordsService } from './time-records.service';

@Module({
  controllers: [TimeRecordsController],
  providers: [TimeRecordsService],
  exports: [TimeRecordsService],
})
export class TimeRecordsModule {}

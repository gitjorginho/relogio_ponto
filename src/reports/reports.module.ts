import { Module } from '@nestjs/common';
import { TimeRecordsModule } from '../time-records/time-records.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TimeRecordsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

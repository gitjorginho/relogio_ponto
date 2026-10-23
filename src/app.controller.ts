import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';

@ApiTags('Saúde')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check da API' })
  getHello() {
    return this.appService.getHealth();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check da API' })
  health() {
    return this.appService.getHealth();
  }
}

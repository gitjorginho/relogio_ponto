import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'relogio_ponto',
      timestamp: new Date().toISOString(),
    };
  }
}

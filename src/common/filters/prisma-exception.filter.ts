import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno ao processar a operação.';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          const targets = exception.meta?.target;
          const target = Array.isArray(targets)
            ? (targets as string[]).join(', ')
            : 'campo único';
          message = `Já existe um registro com este valor (${target}).`;
          break;
        }
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Registro não encontrado.';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'O registro está vinculado a outro registro existente.';
          break;
        default:
          this.logger.error(
            `Erro Prisma ${exception.code}: ${exception.message}`,
          );
      }
    } else {
      status = HttpStatus.BAD_REQUEST;
      message = 'Dados inválidos para a operação.';
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

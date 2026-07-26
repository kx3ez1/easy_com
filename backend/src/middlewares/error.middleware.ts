import type { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.ts';
import { StatusCodes } from '../constants/statusCodes.ts';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('[Error Handler]:', err);

  // Handle invalid JSON body parser errors
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    sendError(res, 'Invalid JSON body syntax', 400, StatusCodes.INVALID_JSON);
    return;
  }

  const statusCode = err.status || 500;
  const errorCode = err.code || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';

  sendError(res, message, statusCode, errorCode);
}


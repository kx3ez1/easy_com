import type { Response } from 'express';
import { StatusCodes } from '../constants/statusCodes.ts';
import type { StatusCode } from '../constants/statusCodes.ts';

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  code: StatusCode;
  data: T;
  error: { message: string } | null;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  code: StatusCode = StatusCodes.OK
): void {
  const responsePayload: ApiResponse<T> = {
    status: 'success',
    code,
    data,
    error: null,
  };
  res.status(statusCode).json(responsePayload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  code: StatusCode = StatusCodes.INTERNAL_SERVER_ERROR
): void {
  const responsePayload: ApiResponse<Record<string, never>> = {
    status: 'error',
    code,
    data: {},
    error: {
      message,
    },
  };
  res.status(statusCode).json(responsePayload);
}

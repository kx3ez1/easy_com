import type { StatusCode } from '../constants/statusCodes.ts';

export class AppError extends Error {
  public readonly status: number;
  public readonly code: StatusCode;

  constructor(status: number, code: StatusCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

import type { Request } from 'express';
import type { RoleCode } from './auth.constants.js';

export interface AuthPrincipal {
  userId: string;
  sessionId: string;
  name: string;
  email: string;
  role: RoleCode;
  mustChangePassword: boolean;
  passwordChangedAt: string;
}

export interface AuthenticatedRequest extends Request {
  requestId: string;
  auth: AuthPrincipal;
}

export interface RequestWithId extends Request {
  requestId: string;
}

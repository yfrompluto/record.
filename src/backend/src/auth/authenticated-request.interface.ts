import type { Request as ExpressRequest } from 'express';

export interface AuthenticatedRequest extends ExpressRequest {
	user : { sub: number; username: string };
}
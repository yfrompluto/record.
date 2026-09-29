// =====================================================================
// 	Global type formatting for Express's Request object.
// 	AuthGuard will automatically attache the decoded JWT to `req.user`, 
// 	allowing controllers to access it with proper type safety, which 
//		avoids manual casting; one global shape for the request.user ->
//		a JWT payload.
// =====================================================================

import { JwtPayload } from '../users/types/jwt-payload.interface';

declare global {
	namespace Express {
		interface Request {
			user: JwtPayload;
		}
	}
}

export {};
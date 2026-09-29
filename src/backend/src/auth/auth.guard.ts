// =====================================================================
//	This guard protects authenticated routes.
// 	It checks checking the JWT access token stored in cookies. If the 
// 	token is valid, the decoded user payload is attached to the re-
// 	quest, else the access is denied.
// =====================================================================

import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express'; 

/**
 * 	- verifyAsync uses the same secret than JwtModule.registerAsync (via Vault)
 * 	- by adding the payload to the req, request.user doesn't have to re-code the tokens
 * 	- if the token is invalid, throwing a vague exception
 * 	Then we end by extracting the token from the http header
 */
@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private jwtService: JwtService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<Request>();
		  const token = request.cookies?.['access_token'];

		if (!token) {
			throw new UnauthorizedException();
		}

		try {
			const payload = await this.jwtService.verifyAsync(token);
			request['user'] = payload;
		} catch {
			throw new UnauthorizedException();
		}

		return true;
	}

	private extractTokenFromHeader(request: Request): string | undefined {
		const [type, token] = request.headers.authorization?.split(' ') ?? [];
		return type === 'Bearer' ? token : undefined;
	}
}

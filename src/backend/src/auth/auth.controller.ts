// =======================================================================
//		Handle authentication endpoints.
//		This controller provides login and user registration routes, receives
//		request data through DTOs & delegates auth logic to the AuthService.
// =======================================================================

import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	Res,
	UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
	constructor(private authService: AuthService) {}

	@HttpCode(HttpStatus.OK)
	@Post("login")
	async signIn(
		@Body() loginDto: LoginDto,
		@Res({ passthrough: true }) response: Response
	) {
		const { access_token } = await this.authService.signIn(
			loginDto.username,
			loginDto.password
		);
		this.setAuthCookie(response, access_token);
		return { message: "Successful login" };
}

	@Post("register")
	async register(
		@Body() registerDto: RegisterDto,
		@Res({ passthrough: true }) response: Response
	) {
		const { access_token } = await this.authService.register(
			registerDto.username,
			registerDto.userMail,
			registerDto.password
		);
		this.setAuthCookie(response, access_token);
		return { message: "Successful registration" };
	}

	@UseGuards(AuthGuard)
	@Get("me")
	getMe(@Req() request: Request) {
		return request["user"];
}

	@HttpCode(HttpStatus.OK)
	@Post("logout")
	logout(@Res({ passthrough: true }) response: Response) {
		response.clearCookie("access_token", {
			httpOnly: true,
			secure: true,
			sameSite: "strict",
		});
		return { message: "Successful logout" };
}

	/**
    *    The cookie config is centralised here
    *       - no dup between login/register
    *       - both endpoints handle the same way
    *    Response:
            - httpOnly; anti-XSS
            - the cookie only works with HTTPS (TLS on nginx's side)
            - anti cross-origin, https://owasp.org/www-community/attacks/csrf
            - maxAge; matches the JwtModule expiration time
    */
	private setAuthCookie(response: Response, token: string) {
		response.cookie("access_token", token, {
			httpOnly: true,
			secure: true,
			sameSite: "strict",
			maxAge: 60 * 60 * 1000,
		});
	}
}

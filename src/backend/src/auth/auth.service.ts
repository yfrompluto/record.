// =======================================================================
//	Retrieve a user and verify the password.
//	All throughout the process, the password never appear in plain text.
//	Instead, we use argon2 for resistant password hashing.
// =======================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
	constructor(
		private usersService: UsersService,
		private jwtService: JwtService,
	) {}

	// Check the creds & sends an access_token JWT is they are valid
	//		- keep error message vague for security purposes
	//		- argon2 compares the hash to the input password
	//		- create the JWT payload with minimal data to identify the user
	async signIn(username: string, pass: string): Promise<{ access_token: string }> {
		const user = await this.usersService.findOne(username);

		if (!user){
			throw new UnauthorizedException();
		}

		const isPasswordValid = await argon2.verify(user.password, pass);
		if (!isPasswordValid){
			throw new UnauthorizedException();
		}

		const payload = { sub: user.id, username: user.username };

		return {
				access_token: await this.jwtService.signAsync(payload),
		};
	}

	// Sign-in endpoint; hashing the password before handing it to UsersService
	//	AuthService receives the plain-text pass from the sign-in field & produces the hash
	//		- check if the username already exists
	//		- generate the hash
	//		- connect user right after sign-up
	async register(
		username: string,
		email: string,
		pass: string,
	): Promise<{ access_token: string }> {
		const passwordHash = await argon2.hash(pass);
		const user = await this.usersService.create(username, email, passwordHash);

		const payload = { sub: user.id, username: user.username };
		return {
			access_token: await this.jwtService.signAsync(payload),
		};
	}
}

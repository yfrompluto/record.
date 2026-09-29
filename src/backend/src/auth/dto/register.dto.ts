// =====================================================================
//		Defines the DTO used for user registration.
//		It validates the required registration fields, ensuring that the
//		provided is in the expected format before creating a new user acc.
// =====================================================================

import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

/**
 * 	The DTO allows us to parse the input, such as making
 * 	sure it's a string, an Email, or choosing a password
 * 	policy.
 */
export class RegisterDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(3, { message: 'Username must be at least 4 characters long' })
	@MaxLength(20, { message: 'Username must be at most 20 characters long' })
	@Matches(/^[a-zA-Z0-9_.]+$/, {
		message: 'Username can only contain letters, numbers, underscores and dots',
	})
	username: string;

	@IsEmail()
	userMail: string;

	@IsString()
	@MinLength(8, { message: 'Password must be at least 8 characters long' })
	@Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
	@Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
	@Matches(/[0-9]/, { message: 'Password must contain at least one diigt' })
	@Matches(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' })
	password: string;
}
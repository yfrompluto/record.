// =====================================================================
//		Declares the the DTO used for user login.
//		It validates the required username and password fields, ensuring
//		they are non-empty strings before processing the auth request.
// =====================================================================

import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
	@IsString()
	@IsNotEmpty()
	username: string;

	@IsString()
	@IsNotEmpty()
	password: string;
}
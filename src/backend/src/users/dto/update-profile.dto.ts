// ==================================================================
//		This DTO (data transfer object) allows user to partially udpate
//		their profile; only the fields modified & sent by the client are
//		applied. 
// ==================================================================

import { IsOptional,
			IsString,
			MaxLength } from 'class-validator';

/**
 * 	Details:
 * 		- IsOptional; create an entity in the DB
 * 		- IsString, MaxLength; customisation
 */
export class UpdateProfileDto {
	@IsOptional()
	@IsString()
	@MaxLength(20)
	displayName?: string;

	@IsOptional()
	@IsString()
	@MaxLength(110)
	bio?: string;
}
// ====================================================================
//		Shape for album and track rating/review endpoints.
// ====================================================================

import { IsNumber, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';

export class RateDto {
	@IsNumber()
	@Min(0.5)
	@Max(5)
	score: number;

	@IsOptional()
	@IsString()
	@MaxLength(1000)
	review?: string;
}
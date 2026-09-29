// =====================================================================
//		Allow users to create playlist on their main profile page,
//		either private (friends only) or visible to the public.
//		By default, playlists are private.
// =====================================================================

import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { PlaylistVisibility } from '@prisma/client';

export class CreatePlaylistDto {
	@IsString()
	@MaxLength(100)
	title: string;

	@IsOptional()
	@IsString()
	@MaxLength(500)
	description?: string;

	@IsOptional()
	@IsEnum(PlaylistVisibility)
	visibility?: PlaylistVisibility;
}
// =====================================================================
//		Allow users to update their playlist.
//		Users can rename, change the description or visibility of the 
// 	playlist.
// =====================================================================

import { PartialType } from '@nestjs/mapped-types';
import { CreatePlaylistDto } from './create-playlist.dto';

export class UpdatePlaylistDto extends PartialType(CreatePlaylistDto) {}
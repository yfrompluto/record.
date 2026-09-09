// =============================================================
//		Shared avatar upload configuration between UsersController
//		& UsersService.
// =============================================================

export const AVATAR_DIR = '/avatars';

/**
 * 	Allows these 3 different extensions.
 * 	Multipurpose Internet Mail Extensions (MIME), is a standard
 * 	that allows us to send file types (images) as an email message.
 * 	MAX_AVATAR_SIZE_BYTES = 2MB
*/ 
export const MIME_TO_EXTENSION: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
};

export const ALLOWED_MIME_TYPES = Object.keys(MIME_TO_EXTENSION);
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
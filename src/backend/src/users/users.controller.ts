// ==================================================================
//		Routing for the users profile.
//		Provides authenticated routes for retrieving & updating the 
// 	current user's profile. Also it exposes a public endpoint to 
//		fetch a user's public profile by its username.
//		Creds are ignored from API reponses to maintain privacy.
// ==================================================================

import {
	Body,
	Controller,
	Get,
	NotFoundException,
	Param,
	Patch,
	Req,
	UseGuards,
	UseInterceptors,
	UnsupportedMediaTypeException,
	UploadedFile,
	Post,
	Query,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import {
	ALLOWED_MIME_TYPES,
	AVATAR_DIR,
	MAX_AVATAR_SIZE_BYTES,
	MIME_TO_EXTENSION,
} from './avatar.constants';
 import type { AuthenticatedRequest } from '../auth/authenticated-request.interface'

interface MulterFile {
	fieldname: string;
	originalname: string;
	mimetype: string;
	size: number;
	destination: string;
	filename: string;
	path: string;
}

@Controller("users")
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	// GET /users/me; to own full profile (includes email)
	@UseGuards(AuthGuard)
	@Get('me')
	async getMe(@Req() req: AuthenticatedRequest) {
		const user = await this.usersService.findById(req.user.sub);
		if (!user) {
			throw new NotFoundException('User not found');
		}
		const { password, ...safeUser } = user;
		return safeUser;
	}

	// PATCH /users/me ; for partial profile update (dn and/or bio)
	@UseGuards(AuthGuard)
	@Patch('me')
	async updateMe(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
		const user = await this.usersService.updateProfile(req.user.sub, dto);
		const { password, ...safeUser } = user;
		return safeUser;
	}

	// POST /users/me/avatar; replaces the current user's avatar
	@UseGuards(AuthGuard)
	@Post('me/avatar')
	@UseInterceptors(
		FileInterceptor('avatar', {
			storage: diskStorage({
				destination: AVATAR_DIR,
				filename: (req, file, callback) => {
					const ext = MIME_TO_EXTENSION[file.mimetype];
					const filename = `${(req as AuthenticatedRequest).user.sub}.${ext}`;
					callback(null, filename);
				},
			}),
			limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
			fileFilter: (req, file, callback) => {
				if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
					callback(new UnsupportedMediaTypeException('Only .webp, .jpg or .png are allowed.'), false);
					return;
				}
				callback(null, true);
			},
		}),
	)
	async uploadAvatar(@Req() req: AuthenticatedRequest, @UploadedFile() file: MulterFile) {
		if (!file) {
  			throw new UnsupportedMediaTypeException('It appears no file was provided.');
		}
		const user = await this.usersService.updateAvatar(req.user.sub, file.filename);
		const { password, ...safeUser } = user;
		return safeUser;
	}

	// GET /users/me/stats; activity analytics for the current user's profile
	@UseGuards(AuthGuard)
	@Get('me/stats')
	getMyStats(@Req() req: AuthenticatedRequest) {
		return this.usersService.getStats(req.user.sub);
	}

	@UseGuards(AuthGuard)
	@Get('search')
	search(@Req() req: AuthenticatedRequest, @Query('q') query: string) {
		if (!query || query.trim().length < 2) return [];
		return this.usersService.search(query.trim(), req.user.sub);
	}

	//	GET - retrieve ratings of an user
	@UseGuards(AuthGuard)
	@Get(':username/ratings')
	getRatings(@Req() req: AuthenticatedRequest, @Param('username') username: string) {
		return this.usersService.getRatings(username, req.user.sub);
	}
	@Get(':username/friends')
	getPublicFriends(@Param('username') username: string) {
		return this.usersService.getPublicFriends(username);
	}
	
	// GET /users/:username; get the public profile
	@Get(':username')
	async getPublicProfile(@Param('username') username: string) {
		const user = await this.usersService.findOne(username);
		if (!user) {
			throw new NotFoundException('User not found');
		}
		const { password, email, ...publicUser } = user;
		return publicUser;
	}
}
import {
	Controller,
	Get,
	Req,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { ExploreService } from './explore.service'

@UseGuards(AuthGuard)
@Controller('explore')
export class ExploreController {
	constructor(private readonly exploreService: ExploreService) {}
	
	@Get('trending')
	trending() {
		return this.exploreService.getTrending();
	}

	@Get('top-rated')
	topRated() {
		return this.exploreService.getTopRated();
	}

	@Get('random')
	random() {
		return this.exploreService.getRandomAlbum();
	}

	@Get('friends-activity')
	// friendsActivity(@Req() req) {
	// 	return this.exploreService.getFriendsActivity(req.user.friendIds);
	// }
	friendsActivity(@Req() req) {
		return this.exploreService.getFriendsActivity(
			Number(req.user.sub),
		);
	}
}
// ====================================================================
//		Control the routes for the rating system.
//		All routes require to be authenticated.
// ====================================================================

import { Controller, 
	Put, 
	Delete, 
	Param, 
	Body, 
	Get, 
	Post, 
	UseGuards, 
	Req, 
	ParseUUIDPipe, 
	ParseIntPipe 
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { RatingService } from './rating.service';
import { RateDto } from './dto/rate.dto';

@UseGuards(AuthGuard)
@Controller()
export class RatingController {
		constructor(private readonly ratingService: RatingService) {}

		// GET the current user's rating for an album (null if not rated yet)
		@Get('albums/:mbid/rating')
		getAlbumRating(@Req() req, @Param('mbid', ParseUUIDPipe) mbid: string) {
			return this.ratingService.getAlbumRating(Number(req.user.sub), mbid);
		}

		@Delete('albums/:mbid/rating')
		removeAlbumRating(@Req() req, @Param('mbid', ParseUUIDPipe) mbid: string) {
			return this.ratingService.removeAlbumRating(Number(req.user.sub), mbid);
		}

		// GET all of the current user's track ratings for an album, keyed by track mbid
		@Get('albums/:mbid/tracks/ratings')
		getTrackRatings(@Req() req, @Param('mbid', ParseUUIDPipe) mbid: string) {
			return this.ratingService.getTrackRatings(Number(req.user.sub), mbid);
		}

		@Put('albums/:albumMbid/tracks/:trackMbid/rating')
		rateTrack(
			@Req() req,
			@Param('albumMbid', ParseUUIDPipe) albumMbid: string,
			@Param('trackMbid', ParseUUIDPipe) trackMbid: string,
			@Body() dto: RateDto,
		) {
			return this.ratingService.rateTrack(Number(req.user.sub), albumMbid, trackMbid, dto.score);
		}

		@Delete('albums/:albumMbid/tracks/:trackMbid/rating')
		removeTrackRating(@Req() req, @Param('trackMbid', ParseUUIDPipe) trackMbid: string) {
			return this.ratingService.removeTrackRating(Number(req.user.sub), trackMbid);
		}

		@Put('albums/:mbid/rating')
		rateAlbum(@Req() req, @Param('mbid', ParseUUIDPipe) mbid: string, @Body() dto: RateDto) {
			return this.ratingService.rateAlbum(Number(req.user.sub), mbid, dto.score, dto.review);
		}

		@Post('ratings/:ratingId/like')
		likeRating(@Req() req, @Param('ratingId', ParseIntPipe) ratingId: number) {
			return this.ratingService.likeRating(Number(req.user.sub), ratingId);
		}

		@Delete('ratings/:ratingId/like')
		unlikeRating(@Req() req, @Param('ratingId', ParseIntPipe) ratingId: number) {
			return this.ratingService.unlikeRating(Number(req.user.sub), ratingId);
		}

		@Delete('albums/:mbid/rec')
		deleteRec(@Req() req, @Param('mbid', ParseUUIDPipe) mbid: string) {
			return this.ratingService.deleteRec(Number(req.user.sub), mbid);
		}
}

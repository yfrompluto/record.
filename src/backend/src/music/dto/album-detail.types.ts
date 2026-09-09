// ========================================================================
//    Complete album detail; release-group + release + front cover. 
// 	This is the shape returned to the frontend for the album detail page,
//    independent of whether the album is imported into the database yet.
// =======================================================================

export interface AlbumDetailDto {
	mbid: string;
	title: string;
	releaseDate?: string;
	releaseYear?: number;
	coverArtUrl: string | null;
	artists: AlbumArtistDto[];
	tracks: AlbumTrackDto[];
}

export interface AlbumArtistDto {
	mbid: string;
	name: string;
}

export interface AlbumTrackDto {
	mbid: string;
	title: string;
	position: number;
}
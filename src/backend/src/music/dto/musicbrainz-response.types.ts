// =====================================================================
//    Type definitions for MusicBrainz API responses - only needed ones
//
//		An MBID (id here) is a 36 character Universally Unique Identifier 
// 	that is permanently assigned to each entity in the database, ie
// 	artists, release groups (albums), releases.
// =====================================================================

export interface MusicBrainzArtistSearchResult {
  count: number;
  artists: MusicBrainzArtist[];
}

export interface MusicBrainzArtist {
	id: string;
	name: string;
	disambiguation?: string;
}

export interface MusicBrainzReleaseGroupSearchResult {
	count: number;
	'release-groups': MusicBrainzReleaseGroup[];
}

/**
 * 	mdid maps to Album.mbid
 * 	date ("2011"), maps to Album.releaseDate
 *		type of album (TBD)
 */
export interface MusicBrainzReleaseGroup {
	id: string;
	title: string;
	'first-release-date'?: string;
	'artist-credit'?: MusicBrainzArtistCredit[];
	releases?: MusicBrainzRelease[];
}

// joinphrase to detect feats when parsing credits
export interface MusicBrainzArtistCredit {
	name: string;
	artist: MusicBrainzArtist;
	joinphrase?: string;
}

export interface MusicBrainzRelease {
	id: string;
	title: string;
	date?: string;
	media?: MusicBrainzMedia[];
}

export interface MusicBrainzMedia {
	tracks: MusicBrainzTrack[];
}

/**
 * 	mbid maps to Track.mbid
 *		position maps to Track.position in an album
 */
export interface MusicBrainzTrack {
	id: string;
	title: string;
	position: number;
}
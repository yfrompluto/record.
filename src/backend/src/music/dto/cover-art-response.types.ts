// =====================================================================
//    Type definitions for Cover Art Archive API responses.
// =====================================================================

export interface CoverArtResponse {
	images: CoverArtImage[];
}

export interface CoverArtImage {
	image: string;
	front: boolean;
	thumbnails?: {
		small?: string;
		large?: string;
	};
}
// =======================================================
//		Helper to organise the "Recent Recs" section of the
//		'My Profile' page
// =======================================================

import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next";
import StarRating from "../../components/music/Rating";

interface AlbumArtist {
	mbid: string
	name: string
}

interface RatedAlbum {
	mbid: string
	title: string
	coverArtUrl: string | null
	releaseYear?: number | null
	artists: AlbumArtist[]
}

export interface RecRating {
	id: number
	score: number
	createdAt: string
	album: RatedAlbum
}

const DEFAULT_COVER = "/icons/def_cover_text.svg";

function formatArtists(artists : AlbumArtist[], t : (key : string) => string): string {
		if (! artists || artists.length === 0) 
			return t("common.unknownArtist");
		return artists.map((a) => a.name).join(", ");
}

function Stars({ value, size = 10 }: { value: number; size?: number }) {
	return (
		<div aria-label="star ratings" className="flex gap-0.5">
			{[1, 2, 3, 4, 5].map((i) => (
				<svg key={i} width={size} height={size} viewBox="0 0 14 14">
					<path
						d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.3l-3.7 1.9.7-4.1-3-2.9 4.2-.7z"
						fill={i <= Math.round(value) ? '#E15A34' : 'rgba(225,90,52,0.18)'}
					/>
				</svg>
			))}
		</div>
	)
}

export default function RecCard({ rating, index }: { rating: RecRating; index: number }) {
	const { t } = useTranslation();
	const [hovered, setHovered] = useState(false)
	const [pressed, setPressed] = useState(false)
	const [coverFailed, setCoverFailed] = useState(false)

	const showFallback = !rating.album.coverArtUrl || coverFailed

	const clearPress = () => setPressed(false)

	return (
		<Link
			to={`/albums/${rating.album.mbid}`}
			className="block"
			style={{ animation: "fade-in 0.35s ease both", animationDelay: `${index * 60}ms` }}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => { setHovered(false); clearPress() }}
			onMouseDown={() => setPressed(true)}
			onMouseUp={clearPress}
			onTouchStart={() => setPressed(true)}
			onTouchEnd={clearPress}
		>
			<div
				className="relative w-full rounded-xl overflow-hidden mb-2"
				style={{
					aspectRatio: "1",
					transform: pressed
						? "scale(0.92)"
						: hovered
						? "translateY(-3px) scale(1.03)"
						: "translateY(0) scale(1)",
					transition: pressed
						? "transform 0.12s ease-out"
						: "transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)",
					boxShadow: hovered
						? "0 12px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.35)"
						: "0 4px 12px rgba(0,0,0,0.3)",
				}}
			>
				<img
					src={showFallback ? DEFAULT_COVER : rating.album.coverArtUrl!}
					alt={showFallback ? `${rating.album.title} (no cover available)` : `${rating.album.title} cover`}
					className="w-full h-full object-cover"
					onError={() => setCoverFailed(true)}
				/>
				<div
					className="absolute inset-0"
					style={{
						background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)",
						opacity: hovered ? 1 : 0,
						transition: "opacity 0.2s ease",
					}}
				/>
			</div>

			<div className="font-body text-xs font-semibold truncate">{rating.album.title}</div>
			<div className="font-body text-[11px] text-white/40 truncate mb-1">
				{formatArtists(rating.album.artists, t)}
			</div>
			<StarRating
				value={rating.score}
				readOnly
				size="rec_stars"
				color="orange"
				label={`Rating: ${rating.score} out of 5`}
			/>
		</Link>
	)
}
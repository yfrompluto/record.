// ==================================================
//		Rec pages - retrieves all of a user's ratings
// ==================================================

import { useEffect, useRef, useState } from "react"
import api from "../../services/api"
import { useTranslation } from "react-i18next"

const DEFAULT_COVER = "/icons/def_cover_text.svg"

interface AlbumArtist {
	mbid: string
	name: string
}

interface RecTrack {
	id: number
	title: string
	position: number
	score?: number
}

interface RecAlbum {
	mbid: string
	title: string
	coverArtUrl: string | null
	releaseYear?: number | null
	artists: AlbumArtist[]
	tracks: RecTrack[]
}

export interface RecRating {
	id: number
	score: number
	review?: string | null
	likesCount: number
	likedByMe: boolean
	createdAt: string
	album: RecAlbum
}

function formatArtists(artists: AlbumArtist[], t: (key: string, opts?: any) => string): string {
	if (!artists || artists.length === 0)
		return t("common.unknownArtist", { defaultValue: "Unknown artist" })
	return artists.map((a) => a.name).join(", ")
}

function Stars({ value, size = 12, label }: { value: number; size?: number; label: string }) {
	return (
		<div className="flex gap-0.5 shrink-0" role="img" aria-label={label}>
			{[1, 2, 3, 4, 5].map((i) => (
				<svg key={i} width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
					<path
						d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.3l-3.7 1.9.7-4.1-3-2.9 4.2-.7z"
						fill={i <= Math.round(value) ? '#d85632da' : 'rgba(225,90,52,0.18)'}
					/>
				</svg>
			))}
		</div>
	)
}

function formatRatedDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function ReviewIcon({ hasReview, size = 15 }: { hasReview: boolean; size?: number }) {
	if (!hasReview)
		return null
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(241,237,230,0.25)" strokeWidth="2" aria-hidden="true">
			<path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
		</svg>
	)
}

function HeartIcon({ size = 12, filled = false }: { size?: number; filled?: boolean }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#F1EDE6" : "none"} stroke="#F1EDE6" strokeWidth="1" aria-hidden="true">
			<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
		</svg>
	)
}

function TrashIcon({ size = 14 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
			<path d="M4 7h16M9 7V4.8c0-.44.36-.8.8-.8h4.4c.44 0 .8.36.8.8V7M6 7l1 13.2c.05.9.8 1.6 1.7 1.6h6.6c.9 0 1.65-.7 1.7-1.6L18 7" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M10 11v6M14 11v6" strokeLinecap="round" />
		</svg>
	)
}

export function BackToTop() {
	const { t } = useTranslation()
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		const onScroll = () => setVisible(window.scrollY > 480)
		window.addEventListener("scroll", onScroll)
		return () => window.removeEventListener("scroll", onScroll)
	}, [])

	if (!visible)
		return null

	return (
		<button
			onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
			className="fixed bottom-8 right-8 w-11 h-11 rounded-full bg-orange text-black shadow-lg shadow-black/40 flex items-center justify-center hover:bg-orange/90 transition-colors z-50 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
			aria-label={t('common.backToTop', { defaultValue: 'Back to top' })}
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
				<path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</button>
	)
}

export default function Recs({
	rating,
	isOpen,
	onOpen,
	onClose,
	onDelete,
	isOwner,
}: {
	rating: RecRating
	isOpen: boolean
	onOpen: () => void
	onClose: () => void
	onDelete: () => void
	isOwner: boolean
}) {
	const { t } = useTranslation()
	const [coverFailed, setCoverFailed] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	// Local like state — optimistic update, reverts on failure
	const [liked, setLiked] = useState(rating.likedByMe)
	const [likesCount, setLikesCount] = useState(rating.likesCount)

	useEffect(() => {
		if (!isOpen)
			return

		function handlePointerDown(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				onClose()
			}
		}
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape")
				onClose()
		}

		document.addEventListener("mousedown", handlePointerDown)
		document.addEventListener("keydown", handleKeyDown)
		return () => {
			document.removeEventListener("mousedown", handlePointerDown)
			document.removeEventListener("keydown", handleKeyDown)
		}
	}, [isOpen, onClose])

	async function handleToggleLike(e: React.MouseEvent) {
		e.stopPropagation()
		const next = !liked
		setLiked(next)
		setLikesCount((c) => c + (next ? 1 : -1))
		try {
			if (next) {
				await api.likeRating(rating.id)
			} else {
				await api.unlikeRating(rating.id)
			}
		} catch {
			setLiked(!next)
			setLikesCount((c) => c + (next ? -1 : 1))
		}
	}

	function handleDeleteClick(e: React.MouseEvent) {
		e.stopPropagation()
		const confirmed = window.confirm(
			t('recs.deleteConfirm', { defaultValue: 'Delete this rec? This cannot be undone.' })
		)
		if (confirmed) onDelete()
	}

	const showFallbackCover = !rating.album.coverArtUrl || coverFailed
	const review = rating.review
	const tracks = rating.album.tracks ?? []
	const panelId = `rating-panel-${rating.id}`

	return (
		<div
			ref={containerRef}
			className="border border-mauve/20 rounded-lg hover:border-mauve/40 transition-colors overflow-hidden h-fit"
		>
			<div className="p-3 flex items-start gap-3">
				<div className="w-16 h-16 rounded-md overflow-hidden shrink-0">
					<img
						src={showFallbackCover ? DEFAULT_COVER : rating.album.coverArtUrl!}
						alt={showFallbackCover
							? t('recs.coverAlt.fallback', { title: rating.album.title, defaultValue: `${rating.album.title} (no cover available)` })
							: t('recs.coverAlt.default', { title: rating.album.title, defaultValue: `${rating.album.title} cover` })}
						className="w-full h-full object-cover"
						onError={() => setCoverFailed(true)}
					/>
				</div>

				<div className="flex-1 min-w-0">
					<div className="font-display text-lg tracking-wide leading-tight truncate">
						{rating.album.title}
					</div>
					<div className="font-body text-sm text-white/50 truncate">
						{formatArtists(rating.album.artists, t)}
						{rating.album.releaseYear && (
							<span className="text-xs text-white/35"> · {rating.album.releaseYear}</span>
						)}
					</div>
				</div>

				<div className="flex flex-col items-end gap-2 shrink-0">
					<span className="font-body text-[10px] text-white/35">{formatRatedDate(rating.createdAt)}</span>
					<div className="flex items-center gap-2">
						<Stars
							value={rating.score}
							size={13}
							label={t('common.starsRating', { count: rating.score, defaultValue: '{{count}} out of 5 stars' })}
						/>
						<ReviewIcon hasReview={!!review} />
					</div>
				</div>
			</div>

			{isOpen && (
				<div id={panelId} className="px-3 pb-3 pt-1 border-t border-mauve/10 flex flex-col gap-4">
					{review ? (
						<p className="font-body text-sm text-white/70 leading-relaxed text-justify">{review}</p>
					) : (
						<p className="font-body text-sm text-white/25 italic">
							<span aria-hidden="true">—</span>
							<span className="sr-only">{t('recs.noReview', { defaultValue: 'No review written' })}</span>
						</p>
					)}
					<div>
						<div className="font-body text-[13px] uppercase tracking-wide text-orange/80 mb-1.5">
							{t('recs.tracklist', { defaultValue: 'Tracklist' })}
						</div>
						{tracks.length === 0 ? (
							<p className="font-body text-xs text-white/25 italic">
								{t('recs.noTracklist', { defaultValue: 'No tracklist available.' })}
							</p>
						) : (
							<ul className="flex flex-col gap-1">
								{tracks.map((track) => (
									<li key={track.id} className="flex items-center justify-between gap-2">
										<span className="font-body text-sm text-white/70 truncate">
											<span className="text-xs text-white/35">{track.position}.</span> {track.title}
										</span>
										{track.score !== undefined ? (
											<Stars
												value={track.score}
												size={9}
												label={t('common.starsRating', { count: track.score, defaultValue: '{{count}} out of 5 stars' })}
											/>
										) : (
											<span className="font-body text-xs text-white/25 shrink-0">
												<span aria-hidden="true">—</span>
												<span className="sr-only">{t('recs.notRated', { defaultValue: 'Not rated' })}</span>
											</span>
										)}
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			)}

			<div className="flex items-center justify-between px-3 pb-2.5">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={handleToggleLike}
						className="flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
						aria-pressed={liked}
						aria-label={liked ? t('recs.unlike', { defaultValue: 'Unlike' }) : t('recs.like', { defaultValue: 'Like' })}
					>
						{likesCount > 0 && (
							<span className="font-body text-xs text-white/45">{likesCount}</span>
						)}
						<HeartIcon filled={liked} />
					</button>

					{isOwner && (
						<button
							type="button"
							onClick={handleDeleteClick}
							className="flex items-center justify-center text-white/35 hover:text-orange transition-colors focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
							aria-label={t('recs.delete', { defaultValue: 'Delete this rec' })}
						>
							<TrashIcon />
						</button>
					)}
				</div>

				<button
					type="button"
					onClick={isOpen ? onClose : onOpen}
					className="font-display text-sm leading-none text-orange/80 hover:opacity-60 px-3 h-6 flex items-center justify-center whitespace-nowrap focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
					aria-expanded={isOpen}
					aria-controls={panelId}
				>
					{isOpen ? t('recs.collapse', { defaultValue: 'Collapse' }) : t('recs.fullRec', { defaultValue: 'Full rec' })}
				</button>
			</div>
		</div>
	)
}
import { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation} from 'react-i18next'
import api from '../../services/api'

interface Artist {
	mbid: string
	name: String
}

interface Album {
	id: number
	mbid: string
	title: string
	coverArtUrl: string | null
	artists: { artist: Artist }[]
}

function artistNames(artists: { artist: Artist }[]) {
	return artists.map((a) => a.artist.name).join(', ')
}

function AlbumGrid({ albums }: { albums: Album[] }) {
	return (
		<div className="grid grid-cols-5 gap-4">
			{albums.map((album, i) => (
				<Link
					key={album.id}
					to={`/albums/${album.mbid}`}
					style={{ animationDelay: `${i * 40}ms` }}
					className="group rounded-lg overflow-hidden border border-mauve/25 hover:border-orange/50 hover:scale-[1.02] transition-all duration-200 animate-[fadeInUp_0.4s_ease-out_backwards]"
				>
					<div className="relative aspect-square overflow-hidden">	
							<img 
							src={album.coverArtUrl || '/icons/def_cover_text.svg'}
							alt={album.title} 
							className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
							/>
							<div className="w-full aspect-square bg-midnight-violet/50 flex items-center justify-center font-body text-xs text-white/40 p-2 text-center">
								{album.title}
							</div>
						<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
					</div>
					<div className="p-2">
						<div className="font-body text-xs text-white truncate">{album.title}</div>
						<div className="font-body text-[11px] text-white/40 truncate">{artistNames(album.artists)}</div>
					</div>
				</Link>
			))}
			<style>{`
				@keyframes fadeInUp {
					from { opacity: 0; transform: translateY(12px); }
					to { opacity: 1; transform: translateY(0); }
				}
			`}</style>
		</div>
	)
}

function AlbumGridSkeleton() {
	return (
		<div className="grid grid-cols-5 gap-4">
			{Array.from({ length: 10 }).map((_, i) => (
				<div key={i} className="rounded-lg overflow-hidden border border-mauve/15">
					<div className="aspect-square bg-white/5 animate-pulse" />
					<div className="p-2 space-y-1.5">
						<div className="h-3 bg-white/5 rounded animate-pulse" />
						<div className="h-2.5 w-2/3 bg-white/5 rounded animate-pulse" />
					</div>
				</div>
			))}
		</div>
	)
}

function EmptySection({ icon, text, ctaText, ctaTo }: { icon: string; text: string; ctaText?: string; ctaTo?: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="text-4xl mb-3 opacity-30">{icon}</div>
			<div className="font-body text-sm text-white/35">{text}</div>
			{ctaText && ctaTo && (
				<Link to={ctaTo} className="mt-3 font-body text-xs text-orange hover:underline">
					{ctaText}
				</Link>
			)}
		</div>
	)
}

export default function ExplorePage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const [trending, setTrending] = useState<Album[]>([])
	const [topRated, setTopRated] = useState<Album[]>([])
	const [loading, setLoading] = useState(true)
	const [surpriseLoading, setSurpriseLoading] = useState(false)
	const [sortBy, setSortBy] = useState<'trending' | 'topRated'>('trending')
	
	useEffect(() => {
		Promise.allSettled([
			api.request('/explore/trending'),
			api.request('/explore/top-rated'),
		]).then(([trendingRes, topRatedRes]) => {
			setTrending(trendingRes.status === 'fulfilled' ? trendingRes.value : [])
			setTopRated(topRatedRes.status === 'fulfilled' ? topRatedRes.value : [])
			setLoading(false)
		})
	}, [])


async function surpriseMe() {
	setSurpriseLoading(true)
	try {
		const album = await api.request('/explore/random')
		if (album) navigate(`/albums/${album.mbid}`)
	} finally {
		setSurpriseLoading(false)
	}
}

// if (loading) {
// 	return <div className="min-h-[calc(100vh-64px)] bg-brown-dark" />
// }

const activeList = sortBy === 'trending' ? trending : topRated
const activeLabel = sortBy === 'trending' ? t('explore.trending') : t('explore.topRated')

return (
	<div className="min-h-full text-white">
		<div className="max-w-6xl mx-auto px-6 py-10">
			<div className="flex items-center justify-between mb-8">
				<h1 className="font-display text-2xl">{t('explore.title')}</h1>
				<button
					onClick={surpriseMe}
					disabled={surpriseLoading}
					className="font-body text-xs uppercase tracking-wide px-5 py-2.5 rounded bg-orange text-black hover:bg-orange/90 shadow-[0_0_20px_rgba(225,90,52,0.35)] hover:shadow-[0_0_28px_rgba(225,90,52,0.5)] transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
				>
					{surpriseLoading ? t('explore.loading') : t('explore.surpriseMe')}
				</button>
			</div>

			{/* Sort filter tabs */}
			<div className="flex gap-2 mb-6">
				{(['trending', 'topRated'] as const).map((s) => (
					<button
						key={s}
						onClick={() => setSortBy(s)}
						className={`font-body text-xs uppercase tracking-wide px-4 py-2 rounded-full border transition-colors ${
								sortBy === s
									? 'bg-orange text-black border-orange'
									: 'text-white/50 border-mauve/30 hover:border-orange/40 hover:text-white/80'
							}`}
					>
						{s === 'trending' ? t('explore.trending') : t('explore.topRated')}
					</button>
				))}
			</div>

			<div>
				<h2 className="font-display text-xl mb-4">{activeLabel}</h2>
				{loading ? (
					<AlbumGridSkeleton />
				) : activeList.length === 0 ? (
					<EmptySection
						text={sortBy === 'trending' ? t('explore.nothingTrending') : t('explore.noRatings')}
					/>
				) : (
					<AlbumGrid albums={activeList} />
				)}
			</div>
		</div>
	</div>
	)
}
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation} from 'react-i18next'
import api from '../../services/api'

interface Artist {
	mbid: string
	name: string
}

interface Album {
	id: number
	mbid: string
	title: string
	coverArtUrl: string | null
	artists: { artist: Artist }[]
}

interface ActivityItem {
	id: number
	score: number
	createdAt: string
	user: { username: string; displayName?: string | null; avatarFilename?: string | null }
	album: Album
}

function artistNames(artists: { artist: Artist } []) {
	return artists.map((a) => a.artist.name).join(', ')
}

function HeroCarousel({ albums }: { albums: Album[] }) {
	if (albums.length === 0) return null

	const looped = [...albums, ...albums]

	return (
		<div className="relative overflow-hidden h-56 mb-12">
			{/* <div className="absolute inset-0 bg-gradient-to-r from-orange/5 via-transparent to-orange/5 pointer-events-none z-10" /> */}
			{/* <div className="absolute inset-0 flex gap-4 animate-[scroll_40s_linear_infinite] hover:[animation-play-state:paused]"> */}
			<div className="absolute inset-0 flex gap-4 animate-[scroll_40s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none">
				{looped.map((album, i) => (
					<Link
						key={`${album.id}-${i}`}
						to={`/albums/${album.mbid}`}
						className="group shrink-0 w-40 h-56 rounded-lg overflow-hidden border border-mauve/25 hover:border-orange/50 hover:scale-[1.03] transition-all"
					>
						<img 
							src={album.coverArtUrl || '/icons/def_cover_text.svg'}
							alt={album.title}
							className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
						/>
					</Link>
				))}
			</div>
			<style>{`
				@keyframes scroll {
					from { transform: translateX(0); }
					to { transform: translateX(-50%); }
				}
			`}</style>
		</div>
	)
}

function HeroSkeleton() {
	return (
		<div className="flex gap-4 h-56 mb-12 overflow-hidden">
			{Array.from({ length: 6}).map((_, i) => (
				<div key={i} className="shrink-0 w-40 h-56 rounded-lg bg-white/5 animate-pulse" />	
			))}
		</div>
	)
}

function EmptySection({ icon, text }: { icon: string; text: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<div className="text-3xl mb-2 opacity-30">{icon}</div>
			<div className="font-body text-sm text-white/70">{text}</div>
		</div>
	)
}

export default function HomePage() {
	const { t } = useTranslation()
	const [trending, setTrending] = useState<Album[]>([])
	const [activity, setActivity] = useState<ActivityItem[]>([])
	const [recs, setRecs] = useState<Album[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		Promise.allSettled([
			api.request('/explore/trending'),
			api.request('/explore/friends-activity'),
			api.request('/explore/top-rated'),
		]).then(([trendingRes, activityRes, recsRes]) => {
			setTrending(trendingRes.status === 'fulfilled' && Array.isArray(trendingRes.value) ? trendingRes.value : [])
			setActivity(activityRes.status === 'fulfilled' && Array.isArray(activityRes.value) ? activityRes.value : [])
			setRecs(recsRes.status === 'fulfilled' && Array.isArray(recsRes.value) ? recsRes.value : [])
			setLoading(false)
		})
	}, [])

	return (
		<div className="min-h-full bg-gradient-to-br from-midnight-violet via-brown-dark to-brown text-white">
			<div className="max-w-5xl mx-auto px-6 py-10">
				<h1 className="sr-only">{t('home.pageTitle', 'Home')}</h1>
				{loading ? <HeroSkeleton /> : <HeroCarousel albums={trending} />}

				<div className="grid grid-cols-[1fr_320px] gap-10">
					{/* Friends' activity feed */}
					<div>
						<div className="relative mb-4">
							<div className="absolute -top-6 -left-4 w-24 h-24 bg-orange/10 rounded-full blur-3xl pointer-events-none" />
							<h2 className="relative font-display text-xl">{t('home.friendsActivity')}</h2>
						</div>
						{loading ? (
							<div className="flex flex-col gap-3">
								{Array.from({ length: 4 }).map((_, i) => (
									<div key={i} className="h-[68px] rounded-lg bg-white/5 animate-pulse" />
								))}
							</div>
						) : activity.length === 0 ? (
							<EmptySection text={t('home.noActivity')} />
						) : (
							<div className="flex flex-col gap-3">
								{activity.map((item, i) => (
									<Link
										key={item.id}
										to={`/albums/${item.album.mbid}`}
										style={{ animationDelay: `${i * 50}ms` }}
										className="group flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 border border-mauve/15 hover:border-orange/30 transition-all animate-[fadeInUp_0.4s_ease-out_backwards]"
									>
										<div className="w-12 h-12 rounded overflow-hidden shrink-0">
											<img 
												src={item.album.coverArtUrl || '/icons/def_cover_text.svg'}
												alt=""
												className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
											/>
										</div>
										<div className="min-w-0 flex-1">
											<div className="font-body text-sm text-white">
												<span className="font-semibold">{item.user.displayName || item.user.username}</span>
												{' ' + t('home.rated') + ' '}
												<span className="font-semibold">{item.album.title}</span>
											</div>
											<div className="font-body text-xs text-white/40 truncate">{artistNames(item.album.artists)}</div>
										</div>
										<div className="font-body text-sm text-orange shrink-0">{item.score.toFixed(1)}★</div>
									</Link>
								))}
							</div>
						)}
					</div>

					{/* Recommendations */}
					<div>
						<h2 className="font-display text-xl mb-4">{t('home.forYou')}</h2>
						{loading ? (
							<div className="flex flex-col gap-2">
								{Array.from({ length: 6 }).map((_, i) => (
									<div key={i} className="h-[52px] rounded-lg bg-white/5 animate-pulse" />
								))}
							</div>
						) : recs.length === 0 ? (
							<EmptySection text={t('home.noRecs')} />
						) : (
							<div className="flex flex-col gap-2">
								{recs.slice(0, 6).map((album, i) => (
									<Link
										key={album.id}
										to={`/albums/${album.mbid}`}
										style={{ animationDelay: `${i * 50}ms` }}
										className="group flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-all animate-[fadeInUp_0.4s_ease-out_backwards]"
									>
										<div className="w-10 h-10 rounded overflow-hidden shrink-0">
											<img
												src={album.coverArtUrl || '/icons/def_cover_text.svg'}
												alt=""
												className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
											/>
										</div>
										<div className="min-w-0">
											<div className="font-body text-xs text-white truncate">{album.title}</div>
											<div className="font-body text-[11px] text-white/40 truncate">{artistNames(album.artists)}</div>
										</div>
									</Link>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
			<style>{`
				@keyframes fadeInUp {
					from { opacity: 0; transform: translateY(8px); }
					to { opacity: 1; transform: translateY(0); }
				}
			`}</style>
		</div>
	)
}
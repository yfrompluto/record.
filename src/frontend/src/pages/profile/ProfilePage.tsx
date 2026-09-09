import { useState, useEffect, useCallback } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useTranslation } from "react-i18next"
import api from '../../services/api'
import RecCard from "./RecCard"
import Recs from "./Recs"
import Playlists, { PlaylistSummary } from "./Playlists"
import ProfilePanel from "../../components/layout/ProfilePanel"

type RelationshipStatus = 'SELF' | 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS' | 'BLOCKED_BY_ME' | 'BLOCKED_BY_THEM'

const DEFAULT_COVER = "/icons/def_cover_text.svg"

interface PublicUser {
	id: number
	username: string
	displayName?: string | null
	avatarFilename?: string | null
	bio?: string | null
}

interface FriendSummary {
	id: number
	username: string
	displayName?: string | null
	avatarFilename?: string | null
}

interface AlbumArtist {
	mbid: string
	name: string
}

interface RatedTrack {
	id: number
	title: string
	position: number
	score?: number
}

interface RatedAlbum {
	mbid: string
	title: string
	coverArtUrl: string | null
	releaseYear?: number | null
	artists: AlbumArtist[]
	tracks: RatedTrack[]
}

interface Rating {
	id: number
	score: number
	review?: string | null
	isAutoRate: boolean
	likesCount: number
	likedByMe: boolean
	createdAt: string
	album: RatedAlbum
}

interface FavAlbum {
	mbid: string
	title: string
	coverArtUrl: string | null
}

type Tab = 'activity' | 'recs' | 'playlists' | 'friends'

const REC_COUNT = 5

function formatArtists(
	artists: AlbumArtist[],
	t: (key: string) => string
): string {
	if (!artists || artists.length === 0) {
		return t('common.unknownArtist')
	}
	return artists.map((a) => a.name).join(", ")
}

function Stars({ value, size = 12 }: { value: number; size?: number }) {
	return (
		<div className="flex gap-0.5">
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

export default function ProfilePage() {
	const { t } = useTranslation()
	const { username } = useParams<{ username: string }>()
	const { user: authUser } = useAuth()
	const navigate = useNavigate()

	const [tab, setTab] = useState<Tab>('activity')
	const [user, setUser] = useState<PublicUser | null>(null)
	const [ratings, setRatings] = useState<Rating[]>([])
	const [favorites, setFavorites] = useState<FavAlbum[]>([])
	const [openId, setOpenId] = useState<number | null>(null)
	const [relationship, setRelationship] = useState<{ status: RelationshipStatus; friendshipId?: number } | null>(null)
	const [loading, setLoading] = useState(true)
	const [friendsList, setFriendsList] = useState<FriendSummary[]>([])
	const [playlists, setPlaylists] = useState<PlaylistSummary[]>([])
	const [openPlaylistId, setOpenPlaylistId] = useState<number | null>(null)
	const [showCreateForm, setShowCreateForm] = useState(false)
	const [newTitle, setNewTitle] = useState('')
	const [newDescription, setNewDescription] = useState('')
	const [createError, setCreateError] = useState<string | null>(null)
	const [creating, setCreating] = useState(false)
	const [showProfilePanel, setShowProfilePanel] = useState(false)

	const isOwner = authUser?.username === username

	const load = useCallback(async () => {
		if (!username)
			return
		setLoading(true)
		try {
			const profile: PublicUser = await api.request(`/users/${username}`)
			setUser(profile)

			const [friendsData, ratingsData, status, favoritesData, playlistsData] = await Promise.allSettled([
				api.request(`/users/${username}/friends`),
				api.request(`/users/${username}/ratings`),
				api.request(`/friends/status/${profile.id}`),
				api.request(`/users/${username}/favorites`),
				isOwner ? api.listMyPlaylists() : api.getUserPlaylists(profile.id),
			])

			setFriendsList(friendsData.status === 'fulfilled' ? friendsData.value : [])
			setRatings(ratingsData.status === 'fulfilled' ? ratingsData.value : [])
			setRelationship(status.status === 'fulfilled' ? status.value : null)
			setFavorites(favoritesData.status === 'fulfilled' ? favoritesData.value : [])
			setPlaylists(playlistsData.status === 'fulfilled' ? playlistsData.value : [])
		} finally {
			setLoading(false)
		}
	}, [username, isOwner])

	useEffect(() => {
		load()
	}, [load, authUser?.displayName, authUser?.bio, authUser?.avatarFilename])

	async function sendRequest() {
		if (!user) return
		try {
			await api.request('/friends/requests', { method: 'POST', body: JSON.stringify({ addresseeId: user.id }) })
			load()
		} catch (err) {
			if (err.status === 409) {
				alert(t('friends.alerts.requestInProgress'))
			} else {
				alert(t('friends.alerts.generic'))
			}
		}
	}

	async function removeFriends() {
		if (!relationship?.friendshipId)
			return
		await api.request(`/friends/${relationship.friendshipId}`, { method: 'DELETE' })
		load()
	}

	async function blockUser() {
		if (!user)
			return
		await api.request(`/friends/block/${user.id}`, { method: 'POST' })
		navigate('/home');
	}

	async function handleCreatePlaylist() {
		setCreateError(null)
		if (!newTitle.trim()) {
			setCreateError(t('playlists.errors.titleRequired', { defaultValue: 'A title is required.' }))
			return
		}
		setCreating(true)
		try {
			await api.createPlaylist({
				title: newTitle.trim(),
				description: newDescription.trim() || undefined,
				visibility: 'PRIVATE',
			})
			setNewTitle('')
			setNewDescription('')
			setShowCreateForm(false)
			const updated = await api.listMyPlaylists()
			setPlaylists(updated)
		} catch (err) {
			setCreateError(t('playlists.errors.createFailed', { defaultValue: "Couldn't create the playlist." }))
		} finally {
			setCreating(false)
		}
	}

	async function handleDeletePlaylist(id: number) {
		try {
			await api.deletePlaylist(id)
			setPlaylists((prev) => prev.filter((p) => p.id !== id))
			setOpenPlaylistId((cur) => (cur === id ? null : cur))
		} catch (err) {
		}
	}

	async function handleDeleteRating(rating: Rating) {
		try {
			await api.deleteRec(rating.album.mbid)
			setRatings((prev) => prev.filter((r) => r.id !== rating.id))
			setOpenId((cur) => (cur === rating.id ? null : cur))
		} catch (err) {
		}
	}

	if (loading || !user) {
		return <div className="min-h-[calc(100vh-64px)] bg-brown-dark" />
	}

	/**
	 * Sort albums in recent rating order
	 */
	const recent = [...ratings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

	const top = [...ratings]
	.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
	.slice(0, REC_COUNT)

	const avatarSrc = user.avatarFilename ? `/avatars/${user.avatarFilename}` : null

	const tabLabels: Record<Tab, string> = {
		activity: t('profile.tabs.activity'),
		recs: t('profile.tabs.recs'),
		playlists: t('profile.tabs.playlists'),
		friends: t('profile.tabs.friends'),
	}

	const visiblePlaylists = isOwner ? playlists : playlists.filter((p) => p.visibility === 'PUBLIC')

	return (
		<div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-olive/70 via-brown-dark to-brown text-white">
			<div className="max-w-5xl mx-auto px-6 py-10">
				{/* Compact header */}
				<div className="relative mb-4">
				<div className="flex items-start gap-5 pb-6 border-b border-mauve/25">
					{avatarSrc ? (
						<img src={avatarSrc} alt="" className="w-20 h-20 rounded-full object-cover shrink-0" />
					) : (
						<div className="w-20 h-20 rounded-full bg-orange flex items-center justify-center font-body text-xl font-bold text-brown-dark shrink-0">
							{(user.displayName || user.username).slice(0, 2).toUpperCase()}
						</div>
					)}

					<div className="flex-1 min-w-0">
						<h1 className="font-display text-2xl">{user.displayName || user.username}</h1>
						<div className="font-body text-sm text-white/40 mb-2">@{user.username}</div>
						{user.bio && <p className="font-body text-sm text-white/65 max-w-md leading-relaxed">{user.bio}</p>}
					</div>

					{isOwner && (
						<button
							onClick={() => setShowProfilePanel(true)}
							className="font-body text-xs uppercase tracking-wide px-5 py-2.5 rounded border border-orange/40 text-orange hover:bg-orange/10 transition-colors focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
						>
							{t("profilePanel.editProfile")}
						</button>
					)}

					<RelationshipButton
						status={relationship?.status}
						onAdd={sendRequest}
						onRemove={removeFriends}
						onBlock={blockUser}
						t={t}
					/>
					{relationship?.status === 'FRIENDS' && (
						<Link
							to={`/chat/${user.username}`}
							className="font-body text-xs uppercase tracking-wide px-5 py-2.5 rounded border border-orange/40 text-orange hover:bg-orange/10 transition-colors"
						>
							{t('profile.message')}
						</Link>
					)}
				</div>

			{/* Tabs  */}
			<div role="tablist" aria-label={t('profile.sections')} className="flex gap-1 border-b border-mauve/25 mt-2 mb-8">
				{(['activity', 'recs', 'playlists', 'friends'] as Tab[]).map((tabKey) => (
					<button
						key={tabKey}
						id={`tab-${tabKey}`}
						role="tab"
						aria-selected={tab === tabKey}
						aria-controls={`tabpanel-${tabKey}`}
						onClick={() => setTab(tabKey)}
						className={`font-body text-sm capitalize px-4 py-3 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 ${
							tab === tabKey ? 'border-orange text-white' : 'border-transparent text-white/40 hover:text-white/70'
						}`}
					>
						{tabLabels[tabKey]}
					</button>
				))}
			</div>

			{tab === 'activity' && (
				<div role="tabpanel" id="tabpanel-activity" aria-labelledby="tab-activity" className="flex flex-col gap-10">
					<div>
						<h2 className="font-display text-xl mb-4">{t('profile.favs')}</h2>
						{favorites.length === 0 ? (
							<EmptyState text={t('profile.noFavsYet')} />
						) : (
							<div className="flex gap-6">
								{favorites.map((album) => (
									<Link
										key={album.mbid}
										to={`/albums/${album.mbid}`}
										className="block w-40 h-40 rounded overflow-hidden shrink-0 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
									>
										<img
											src={album.coverArtUrl || DEFAULT_COVER}
											alt={t('profile.favCoverAlt', { title: album.title })}
											className="w-full h-full object-cover"
										/>
									</Link>
								))}
							</div>
						)}
					</div>
					<div>
						<h2 className="font-display text-lg mb-4">{t('profile.recentRecs')}</h2>
						{top.length === 0 ? (
							<EmptyState text={t('profile.noRecsYet')} />
						) : (
							<div
								className="grid gap-3"
								style={{ gridTemplateColumns: `repeat(${REC_COUNT}, minmax(0, 64px))` }}
							>
								{top.map((r, i) => (
									<RecCard key={r.id} rating={r} index={i} />
								))}
							</div>
						)}
					</div>

					<div>
						<h2 className="font-display text-lg mb-4">{t('profile.recentActivity')}</h2>
						{recent.length === 0 ? (
							<EmptyState text={t('profile.noActivityYet')} />
						) : (
							<div className="flex flex-col gap-1">
								{recent.map((r) => (
									<Link key={r.id} to={`/albums/${r.album.mbid}`} className="flex items-center gap-3 py-1.5 hover:bg-white/5 rounded px-2 -mx-2">
										<div className="w-2 h-2 rounded-full bg-orange/50 shrink-0" />
										<span className="font-body text-xs text-white/70 truncate">{r.album.title}</span>
										<span className="font-body text-xs text-white/35">— {formatArtists(r.album.artists, t)}</span>
									</Link>
								))}
							</div>
						)}
					</div>
				</div>
			)}
			{tab === 'recs' && (
				<div role="tabpanel" id="tabpanel-recs" aria-labelledby="tab-recs">
					{ratings.length === 0 ? (
						<EmptyState text={t('profile.noRecsTab')} />
					) : (
						<div className="grid grid-cols-2 gap-3 items-start">
							{ratings.map((r) => (
								<Recs
									key={r.id}
									rating={r}
									isOpen={openId === r.id}
									onOpen={() => setOpenId(r.id)}
									onClose={() => setOpenId((cur) => (cur === r.id ? null : cur))}
									onDelete={() => handleDeleteRating(r)}
									isOwner={isOwner}
								/>
							))}
						</div>
					)}
				</div>
			)}

			{tab === 'playlists' && (
				<div role="tabpanel" id="tabpanel-playlists" aria-labelledby="tab-playlists">
					{isOwner && (
						<div className="flex items-center justify-end mb-6">
							<button
								onClick={() => setShowCreateForm((v) => !v)}
								aria-expanded={showCreateForm}
								aria-controls="create-playlist-form"
								className="font-body text-[13px]  tracking-wide text-orange hover:opacity-80 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
							>
								{showCreateForm
									? t('playlists.cancelCreate', { defaultValue: 'Cancel' })
									: t('playlists.newPlaylist', { defaultValue: '+ Create new playlist' })}
							</button>
						</div>
					)}

					{isOwner && showCreateForm && (
						<form
							id="create-playlist-form"
							onSubmit={(e) => {
								e.preventDefault()
								handleCreatePlaylist()
							}}
							className="mb-8 flex flex-col gap-3"
						>
							<div>
								<label htmlFor="new-playlist-title" className="sr-only">
									{t('playlists.form.titleLabel', { defaultValue: 'Title' })}
								</label>
								<input
									id="new-playlist-title"
									type="text"
									placeholder={t('playlists.form.titleLabel', { defaultValue: 'Title' })}
									value={newTitle}
									onChange={(e) => setNewTitle(e.target.value)}
									className="w-full bg-black/30 rounded p-2 text-sm text-white/70 placeholder:text-white/30 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
								/>
							</div>
							<div>
								<label htmlFor="new-playlist-description" className="sr-only">
									{t('playlists.form.descriptionLabel', { defaultValue: 'Description (optional)' })}
								</label>
								<input
									id="new-playlist-description"
									type="text"
									placeholder={t('playlists.form.descriptionLabel', { defaultValue: 'Description (optional)' })}
									value={newDescription}
									onChange={(e) => setNewDescription(e.target.value)}
									className="w-full bg-black/30 rounded p-2 text-sm text-white/70 placeholder:text-white/30 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
								/>
								<div className="text-right font-body text-[11px] text-white/30 mt-0.5">
									{newDescription.length}/100
								</div>
							</div>
							{createError && (
								<p role="alert" className="text-orange/80 text-xs">
									{createError}
								</p>
							)}
							<button
								type="submit"
								disabled={creating}
								className="self-start font-body text-xs uppercase tracking-wide text-orange disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
							>
								{creating ? t('playlists.form.creating', { defaultValue: 'Creating...' }) : t('playlists.form.submit', { defaultValue: 'Create' })}
							</button>
						</form>
					)}
					{visiblePlaylists.length === 0 ? (
						<EmptyState
							text={isOwner ? t('playlists.emptyMine') : t('playlists.emptyUser')}
						/>
					) : (
						<div className="flex flex-col gap-3">
							{visiblePlaylists.map((playlist) => (
								<Playlists
									key={playlist.id}
									playlist={playlist}
									isOwner={isOwner}
									isOpen={openPlaylistId === playlist.id}
									onOpen={() => setOpenPlaylistId(playlist.id)}
									onClose={() => setOpenPlaylistId((cur) => (cur === playlist.id ? null : cur))}
									onDelete={() => handleDeletePlaylist(playlist.id)}
								/>
							))}
						</div>
					)}
				</div>
			)}

			{tab === 'friends' && (
							<div role="tabpanel" id="tabpanel-friends" aria-labelledby="tab-friends" className="flex flex-col gap-0.5 max-w-md">
								{friendsList.length === 0 ? (
									<EmptyState text={t('profile.noFriendsYet')} />
								) : (
									friendsList.map((friend) => (
										<Link
											key={friend.id}
											to={`/profile/${friend.username}`}
											className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/5 transition-colors"
										>
											{friend.avatarFilename ? (
												<img src={`/avatars/${friend.avatarFilename}`} alt="" className="w-9 h-9 rounded-full object-cover" />
											) : (
												<div className="w-9 h-9 rounded-full bg-orange flex items-center justify-center font-body text-xs font-bold text-brown-dark">
													{(friend.displayName || friend.username).slice(0, 2).toUpperCase()}
												</div>
											)}
											<div>
												<div className="font-body text-sm font-semibold text-white">{friend.displayName || friend.username}</div>
												<div className="font-body text-xs text-white/40">@{friend.username}</div>
											</div>
										</Link>
									))
								)}
							</div>
						)}
						</div>
					</div>

				{showProfilePanel && (
					<ProfilePanel
						initialMode="edit"
						onClose={() => {
							setShowProfilePanel(false)
							load()
						}}
					/>
				)}
			</div>
	)
}

function RelationshipButton({ status, onAdd, onRemove, onBlock, t }: {
	status?: RelationshipStatus
	onAdd: () => void
	onRemove: () => void
	onBlock: () => void
	t: (key: string) => string
}) {
	if (!status || status === 'SELF') return null

	if (status === 'NONE') {
		return <ActionBtn label={t('profile.relationship.add')} onClick={onAdd} />
	}
	if (status === 'PENDING_SENT') {
		return <span className="font-body text-xs text-white/40 uppercase tracking-wide px-4 py-2">On hold…</span>
	}
	if (status === 'PENDING_RECEIVED') {
		return <span className="font-body text-xs text-white/40 uppercase tracking-wide px-4 py-2">Request received</span>
	}
	if (status === 'FRIENDS') {
		return <ActionBtn label={t('profile.relationship.friend')}  onClick={onRemove} muted />
	}
	return <span className="font-body text-xs text-white/30 uppercase tracking-wide px-4 py-2">Blocked</span>
}

function ActionBtn({ label, onClick, muted }: { label: string; onClick: () => void; muted?: boolean }) {
	return (
		<button
			onClick={onClick}
			className={`font-body text-xs uppercase tracking-wide px-5 py-2.5 rounded transition-colors focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 ${
			muted ? 'border border-mauve/40 text-white/70 hover:bg-mauve/10' : 'bg-orange text-black hover:bg-orange/90'
		}`}
	>
		{label}
	</button>
	)
}

function EmptyState({ text }: { text: string }) {
	return <div className="font-body text-sm text-white/35 py-6">{text}</div>
}

function ComingSoon({ text }: { text: string }) {
	return (
		<div className="border border-dashed border-mauve/30 rounded p-10 text-center font-body text-sm text-white/35">
			{text}
		</div>
	)
}
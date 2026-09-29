import React, { useState, useEffect, useCallback, useRef } from "react"
import api from '../../services/api'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useNotifications } from "../../context/NotificationContext"
import { useTranslation} from 'react-i18next'
import { io } from 'socket.io-client'

interface UserSummary {
	id: number
	username: string
	displayName?: string | null
	avatarFilename?: string | null
	friendshipId?: number
}

interface FriendRequest {
	id: number
	requester: UserSummary
}

type Tab = 'friends' | 'requests' | 'blocked' | 'find'

const ACCENTS = ['orange', 'mauve', 'mustard', 'olive', 'midnight-violet']

const ACCENTS_CLASSES = ['bg-mauve', 'bg-olive', 'bg-midnight-violet', 'bg-plum', 'bg-brown-dark']

const VALID_TABS: Tab[] = ['friends', 'requests', 'blocked', 'find']

function accentClassFor(id: number) {
	return ACCENTS_CLASSES[id % ACCENTS_CLASSES.length]
}

function initials(user: UserSummary) {
	const source = user.displayName || user.username
	return source.slice(0, 2).toUpperCase()
}

export default function FriendsPage() {
	const { t } = useTranslation()
	const { markAllAsReadByType, notifications } = useNotifications()
	const [searchParams] = useSearchParams()
	const initialTab = VALID_TABS.includes(searchParams.get('tab') as Tab)
		? (searchParams.get('tab') as Tab)
		: 'friends'

	const [tab, setTab] = useState<Tab>(initialTab)
	const [friends, setFriends] = useState<UserSummary[]>([])
	const [requests, setRequests] = useState<FriendRequest[]>([])
	const [blocked, setBlocked] = useState<UserSummary[]>([])
	const [searchQuery, setSearchQuery] = useState('')
	const [searchResults, setSearchResults] = useState<UserSummary[]>([])
	const [loading, setLoading] = useState(false)

	const loadFriends = useCallback(async () => setFriends(await api.request('/friends')), [])
	const loadRequests = useCallback(async () => setRequests(await api.request('/friends/requests')), [])
	const loadBlocked = useCallback(async () => setBlocked(await api.request('/friends/blocked')), [])

	const blockedIds = new Set(blocked.map(u => u.id));
	const visibleResults = searchResults.filter(
		user => !blockedIds.has(user.id)
	);

	useEffect(() => {
		const socket = io('/', { path: '/socket.io', withCredentials: true, transports: ['websocket'] })
		socket.on('friendRemoved', () => {
			loadFriends()
		})
		return () => { socket.disconnect() }
	}, [loadFriends])

	useEffect(() => {
		loadFriends()
		loadRequests()
		loadBlocked()
	}, [loadFriends, loadRequests, loadBlocked])

	const processedNotifIds = useRef(new Set())
	useEffect(() => {
		const relevant = notifications.filter(
			(n) => !processedNotifIds.current.has(n.id) && ['FRIEND_REQUEST', 'FRIEND_REQUEST_ACCEPTED'].includes(n.type)
		)
		if (relevant.length === 0)
			return
		relevant.forEach((n) => processedNotifIds.current.add(n.id))
		loadFriends()
		loadRequests()
	}, [notifications, loadFriends, loadRequests])

	useEffect(() => {
			markAllAsReadByType(['FRIEND_REQUEST', 'FRIEND_REQUEST_ACCEPTED'])
		}, [markAllAsReadByType])

	useEffect(() => {
		const urlTab = searchParams.get('tab')
		if (urlTab && VALID_TABS.includes(urlTab as Tab)) {
			setTab(urlTab as Tab)
		}
	}, [searchParams])

	useEffect(() => {
		if (tab !== 'find' || searchQuery.trim().length < 2) {
			setSearchResults([])
			return
		}
		const timeout = setTimeout(async () => {
			setLoading(true)
			try {
				setSearchResults(await api.request(`/users/search?q=${encodeURIComponent(searchQuery)}`))
			} finally {
				setLoading(false)
			}
		}, 300)
		return () => clearTimeout(timeout)
	}, [searchQuery, tab])

	async function sendRequest(addresseeId: number) {
		try {
			await api.request('/friends/requests', { method: 'POST', body: JSON.stringify({ addresseeId }) })
			setSearchResults((prev) => prev.filter((u) => u.id !== addresseeId))
		} catch (err) {
			if (err.status === 409) {
				alert(t('friends.alerts.requestInProgress'))
			} else if (err.status === 403 && err.message?.includes('yourself')) {
				alert(t('friends.alerts.cannotAddSelf'))
			} else if (err.status === 403) {
				alert(t('friends.alerts.blockedUser', { defaultValue: 'You cannot add this user.' }))
			} else {
				alert(t('friends.alerts.generic'))
			}
		}
	}

	async function respond(requestId: number, status: 'ACCEPTED' | 'DECLINED') {
		await api.request(`/friends/requests/${requestId}/respond`, { method: 'POST', body: JSON.stringify({ status }) })
		setRequests((prev) => prev.filter((r) => r.id !== requestId))
		if (status === 'ACCEPTED') loadFriends()
	}

	async function removeFriends(friendshipId: number){
		await api.request(`/friends/${friendshipId}`, { method: 'DELETE' })
		loadFriends()
	}

	async function blockUser(userId: number) {
		await api.request(`/friends/block/${userId}`, {method : 'POST'});

		await Promise.all([
			loadFriends(),
			loadBlocked(),
			loadRequests(),
	]);

	if (searchQuery.trim().length >= 2) {
		setSearchResults(
			await api.request(`/users/search?q=${encodeURIComponent(searchQuery)}`)
		);
	} else {
		setSearchResults([]);
	}
}

	async function unblockUser(userId: number) {
		await api.request(`/friends/block/${userId}`, {method: 'DELETE' })
		loadBlocked()
	}

	const tabs: { key: Tab; label: string; count?: number }[] = [
		{ key: 'friends', label: t('friends.tabs.friends'), count: friends.length },
		{ key: 'requests', label: t('friends.tabs.requests'), count: requests.length },
		{ key: 'blocked', label: t('friends.tabs.blocked'), count : blocked.length },
		{ key: 'find', label: t('friends.tabs.find') },
	]

	return (
		<div className="relative min-h-[calc(100vh-64px)] px-10 py-8 overflow-hidden">
			<div className="absolute -bottom-16 -right-16 w-64 h-64 bg-orange/10 rounded-full blur-3xl pointer-events-none" />
			
			<div className="relative">
			<h1 className="font-display text-white text-3xl mb-6">{t('friends.title')}</h1>

			<div role="tablist" aria-label="Friends sections" className="flex gap-1 border-b border-mauve/30 mb-6">
				{tabs.map((t) => (
					<button
						key={t.key}
						role="tab"
						id={`tab-${t.key}`}
						aria-selected={tab === t.key}
						aria-controls={`tabpanel-${t.key}`}
						onClick={() => setTab(t.key)}
						className={`flex items-center gap-2 px-4 py-2.5 font-body text-sm font-semibold border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded-t ${
						tab === t.key ? 'border-orange text-white' : 'border-transparent text-white/45 hover:text-white/70'
						}`}
					>
						{t.label}
						{typeof t.count === 'number' && t.count > 0 && (
							<span className={`font-body text-[10px] font-bold rounded-full px-2 py-0.5 ${
                  					tab === t.key ? 'bg-orange text-black' : 'bg-white/10 text-white/60'
                					}`}>
								{t.count}
							</span>
						)}
					</button>
				))}
			</div>

			{tab === 'friends' && (
				<div role="tabpanel" id="tabpanel-friends" aria-labelledby="tab-friends" className="flex flex-col gap-0.5">
				{friends.length === 0 && <EmptyState text={t('friends.noFriendsYet')} />}
				{friends.map((friend) => (
					<Row key={friend.id} user={friend}>
						<MessageButton username={friend.username} />
						<ActionButton label={t('friends.actions.remove')} onClick={() => removeFriends(friend.friendshipId)} />
						<ActionButton label={t('friends.actions.block')} danger onClick={() => blockUser(friend.id)} />
					</Row>
				))}
			</div>
		)}

		{tab === 'requests' && (
			<div role="tabpanel" id="tabpanel-requests" aria-labelledby="tab-requests" className="flex flex-col gap-0.5">
				{requests.length === 0 && <EmptyState text={t('friends.noPendingRequests')} />}
				{requests.map((req) => (
					<Row key={req.id} user={req.requester}>
						<ActionButton label={t('friends.actions.accept')} accent onClick={() => respond(req.id, 'ACCEPTED')} />
						<ActionButton label={t('friends.actions.decline')} onClick={() => respond(req.id, 'DECLINED')} />
						<ActionButton label={t('friends.actions.block')} danger onClick={() => blockUser(req.requester.id)} />
					</Row>
				))}
			</div>
		)}

		{tab === 'blocked' && (
			<div role="tabpanel" id="tabpanel-blocked" aria-labelledby="tab-blocked" className="flex flex-col gap-0.5">
				{blocked.length === 0 && <EmptyState text={t('friends.noOneBlocked')} />}
				{blocked.map((user) => (
					<Row key={user.id} user={user} >
						<ActionButton label={t('friends.actions.unblock')} onClick={() => unblockUser(user.id)} />
					</Row>
				))}
			</div>
		)}

		{tab === 'find' && (
			<div role="tabpanel" id="tabpanel-find" aria-labelledby="tab-find">
				<input
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder={t('friends.searchPlaceholder')}
					className="font-body w-full max-w-sm bg-black/40 text-white placeholder-white/50 rounded px-3 py-2 text-sm mb-5 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
				/>

				{loading && <EmptyState text={t('friends.searching')} />}
				{!loading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
					<EmptyState text={t('friends.noResults')} />
				)}

				<div className="flex flex-col gap-0.5">
					{visibleResults.map((user) => (
						<Row key={user.id} user={user}>
							<ActionButton label={t('friends.actions.add')} accent onClick={() => sendRequest(user.id)} />
						</Row>
					))}
				</div>
			</div>
		)}
	</div>
</div>
	)
}

function Row({ user, children }: { user: UserSummary; children: React.ReactNode }) {
  const avatarSrc = user.avatarFilename ? `/avatars/${user.avatarFilename}` : null

  return (
	<div className="flex items-center gap-3.5 px-3.5 py-3 rounded hover:bg-white/5 transition-colors">
		<Link
			to={`/profile/${user.username}`}
			className="flex items-center gap-3.5 flex-1 min-w-0 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
		>
			{avatarSrc ? (
				<img src={avatarSrc} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
			) : (
				<div className={`w-9 h-9 rounded-full flex items-center justify-center font-body text-xs font-bold text-white shrink-0 ${accentClassFor(user.id)}`}>
			{initials(user)}
		</div>
		)}
		<div className="flex-1 min-w-0">
			<div className="font-body text-sm font-semibold text-white">{user.displayName || user.username}</div>
			<div className="font-body text-xs text-white/40 mt-0.5">@{user.username}</div>
		</div>
		</Link>
		<div className="flex gap-2 shrink-0">
			{children}
		</div>
	</div>
  )
}

function MessageButton({ username }: { username: string }) {
	const { t } = useTranslation()
	const navigate = useNavigate()
	return (
		<button
			onClick={(e) => {
				e.preventDefault()
				navigate(`/chat/${username}`)
			}}
			className="font-body text-xs px-3 py-1.5 rounded border whitespace-nowrap bg-orange/10 border-orange/40 text-orange hover:bg-orange/20 transition-colors"
		>
			{t('friends.actions.message')}
		</button>
	)
}


function ActionButton({ label, onClick, accent, danger }: {
	label: string
	onClick: () => void
	accent?: boolean
	danger?: boolean
}) {
	const colorClasses = accent
		? 'bg-green-600/10 border-green-600/40 text-green-500 hover:bg-green-600/20'
		: danger
		? 'bg-red-600/10 border-red-600/40 text-red-500 hover:bg-red-600/20'
		: 'bg-orange/10 border-orange/40 text-orange hover:bg-orange/20'

	return (
		<button
			onClick={onClick}
			className={`font-body text-xs font-medium px-3 py-1.5 rounded border whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 ${colorClasses}`}
		>
			{label}
		</button>
	)
}

function EmptyState({ text}: { text: string }) {
	return <div className="py-8 text-center font-body text-sm text-white/40">{text}</div>
}
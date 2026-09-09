import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Link, useParams } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'
import { useTranslation} from 'react-i18next'
import AlbumIcon from "../../assets/icons/album.svg?react";
import BlindtestIcon from "../../assets/icons/blindtest_chat.svg?react";

interface Friend {
	id: number
	username: string
	displayName?: string | null
	avatarFilename?: string | null
}

interface Message {
	id: number
	content: string
	type: string
	albumMbid: string | null
	isRead: boolean
	createdAt: string
	senderId: number
	receiverId: number
	sender: { id: number; username: string; displayName?: string | null; avatarFilename?: string | null }
}

interface AlbumDetail {
	mbid: string
	title: string
	releaseYear?: number
	coverArtUrl: string | null
	artists: { mbid: string; name: string }[]
}

function AlbumMessageCard({ mbid, isMe }: { mbid: string; isMe: boolean }) {
	const { t } = useTranslation()
	const [album, setAlbum] = useState<AlbumDetail | null>(null)

	useEffect(() => {
		api.request(`/music/albums/${mbid}`).then(setAlbum).catch(() => {})
	}, [mbid])

	if (!album) {
		return (
			<div className={`max-w-[240px] px-3.5 py-3 rounded-xl font-body text-xs text-white/40 ${
				isMe ? 'bg-orange/20' : 'bg-midnight-violet/40 border border-mauve/25'
			}`}>
				{t('chat.loadingAlbum')}
			</div>
		)
	}

	const artistNames = album.artists.map((a) => a.name).join(',')

	return (
		<Link
			to={`/albums/${album.mbid}`}
			className={`block max-w-[240px] rounded-xl overflow-hidden transition-transform hover:scale-[1.02] ${
				isMe ? 'bg-orange/15 border border-orange/30' : 'bg-midnight-violet/50 border border-mauve/25'
			}`}
		>
			{album.coverArtUrl && (
				<img src={album.coverArtUrl || '/icons/def_cover_text.svg'} alt={album.title} className="w-full aspect-square object-cover" />
			)}
			<div className="p-3">
				<div className="font-body text-xs text-white/40 uppercase tracking-wide mb-1">{t('chat.sharedAlbum')}</div>
				<div className="font-display text-sm text-white truncate">{album.title}</div>
				<div className="font-body text-xs text-white/50 truncate">{artistNames}</div>
			</div>
		</Link>
	)
}

function initials(user: { displayName?: string | null; username: string }) {
	return (user.displayName || user.username).slice(0, 2).toUpperCase()
}

function formatTime(iso: string) {
	return new Date(iso).toLocaleString('fr-FR', {
		dateStyle: 'short',
		timeStyle: 'short',
	})
}

export default function ChatPage() {
	const { t } = useTranslation()
	const { username } = useParams<{ username?: string }>()
	const { user: me } = useAuth()
	const { markAllAsReadByType } = useNotifications()
	const [friends, setFriends] = useState<Friend[]>([])
	const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState('')
	const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set())
	const [friendIsTyping, setFriendIsTyping] = useState(false)
	const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null)

	const [showAlbumSearch, setShowAlbumSearch] = useState(false)
	const [albumQuery, setAlbumQuery] = useState('')
	const [albumResults, setAlbumResults] = useState<AlbumDetail[]>([])

	const socketRef = useRef<Socket | null>(null)
	const bottomRef = useRef<HTMLDivElement>(null)
	const selectedFriendRef = useRef<Friend | null>(null)
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

useEffect(() => {
	api.request('/friends').then((data) => {
		setFriends(data)
		if (data.length === 0)  return 
		
		if (username) {
			const match = data.find((f: Friend) => f.username === username)
			setSelectedFriend(match || data[0])
		} else {
			setSelectedFriend(data[0])
		}
	})
}, [username])

useEffect(() => {
	selectedFriendRef.current = selectedFriend
	setFriendIsTyping(false)
}, [selectedFriend])

useEffect(() => {
	markAllAsReadByType(['NEW_MESSAGE'])
}, [markAllAsReadByType])

useEffect(() => {
	const socket = io('/', {
		path: '/socket.io',
		withCredentials: true,
		transports:['websocket'],
	})
	socketRef.current = socket

	socket.on('onlineUsers', (ids: number[]) => {
		setOnlineIds(new Set(ids))
	})

	socket.on('presenceUpdate', ({ userId, online }: { userId: number; online: boolean }) => {
		console.log('[chat] Presence update:', userId, online);
		
		setOnlineIds((prev) => {
			const next = new Set(prev)
			if (online) next.add(userId)
			else next.delete(userId)
			return next
		})
	})

	socket.on('newMessage', (msg: Message) => {
		setMessages((prev) => {
			const friendId = selectedFriendRef.current?.id
			const isRelevant =
				(msg.senderId === friendId && msg.receiverId === me?.id) ||
				(msg.senderId === me?.id && msg.receiverId === friendId)
			return isRelevant ? [...prev, msg] : prev
		})

		// currently viewing just sent, mark as read immediately
		if (msg.senderId === selectedFriendRef.current?.id) {
			socket.emit('markAsRead', { senderId: msg.senderId })
		}
	})

	

	socket.on('userTyping', ({ userId }: {userId: number }) => {
		if (userId === selectedFriendRef.current?.id) setFriendIsTyping(true)
	})

	socket.on('userStoppedTyping', ({ userId }: { userId: number }) => {
		if (userId === selectedFriendRef.current?.id) setFriendIsTyping(false)
	})

	socket.on('messageRead', ({ readerId }: { readerId: number }) => {
		setMessages((prev) => 
			prev.map((m) => (m.receiverId === readerId ? { ...m, isRead: true } : m)),	
		)
	})

	return () => {
		socket.disconnect()
	}
}, [me])

const loadHistory = useCallback(async (friendId: number) => {
	const data = await api.request(`/chat/history/${friendId}`)
	setMessages(data)
}, [])

useEffect(() => {
	if (albumQuery.trim().length < 2) {
		setAlbumResults([])
		return
	}
	const timeout = setTimeout(() => {
		api.request(`/music/search?q=${encodeURIComponent(albumQuery)}`)
		.then((data) => {
			const releaseGroups = data?.['release-groups'] ?? []
			const mapped = releaseGroups.map((rg: any) => ({
				mbid: rg.id,
				title: rg.title,
				coverArtUrl: rg.coverArtUrl ?? null,
				artists: (rg['artist-credit'] ?? []).map((c: any) => ({
					mbid: c.artist?.id,
					name: c.name,
				})),
			}))
			setAlbumResults(mapped)
		})
		.catch((err) => {
			console.error(err)
			setAlbumResults([])
		})
	}, 300)

	return () => clearTimeout(timeout)
}, [albumQuery])

useEffect(() => {
	if (selectedFriend) {
		loadHistory(selectedFriend.id)
	socketRef.current?.emit('markAsRead', { senderId: selectedFriend.id })
	}
}, [selectedFriend, loadHistory])

useEffect(() => {
	bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages.length])

function shareAlbum(mbid: string) {
	if (!selectedFriend || !socketRef.current) return
	socketRef.current.emit('shareAlbum', {
		receiverId: selectedFriend.id,
		albumMbid: mbid,
	})
	setShowAlbumSearch(false)
	setAlbumQuery('')
}

function inviteBlindTest() {
	if (!selectedFriend || !socketRef.current) return
	socketRef.current.emit('inviteBlindTest', {
		receiverId: selectedFriend.id,
	})
}

function handleInputChange(value: string) {
	setInput(value)
	if (!selectedFriend || !socketRef.current) return
	
	socketRef.current.emit('typing', { receiverId: selectedFriend.id })

	if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
	typingTimeoutRef.current = setTimeout(() => {
		socketRef.current?.emit('stopTyping', { receiverId: selectedFriend.id })
	}, 1500)
}

function sendMessage() {
	if (!input.trim() || !selectedFriend || !socketRef.current) return
	socketRef.current.emit('sendMessage', {
		receiverId: selectedFriend.id,
		content: input,
	})
	socketRef.current.emit('stopTyping', { receiverId: selectedFriend.id })
	if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
	setInput('')
}


function handleKey(e: React.KeyboardEvent) {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault()
		sendMessage()
	}
}

function BlindTestInviteCard({ sessionId, isMe }: { sessionId: string; isMe: boolean }) {
	const { t } = useTranslation()
	const href = isMe
		? `/blindtest/${sessionId}?mode=host&invited=1`
		: `/blindtest/${sessionId}`

	return (
		<Link
			to={href}
			className={`block max-w-[240px] rounded-xl overflow-hidden transition-transform hover:scale-[1.02] px-3.5 py-3 ${
				isMe ? 'bg-orange/15 border border-orange/30' : 'bg-midnight-violet/50 border border-mauve/25'
			}`}
		>
			<div className="font-body text-xs text-white/40 uppercase tracking-wide mb-1">{t('chat.blindTestInvite')}</div>
			<div className="font-display text-sm text-white">{t('chat.tapToJoin')}</div>
		</Link>
	)
}

const isFriendOnline = selectedFriend ? onlineIds.has(selectedFriend.id) : false


return (
	<div className="h-full text-white">
	<div className="grid grid-cols-[280px_1fr] h-full min-h-0">
		{/* Sidebar */}
		<aside className="border-r border-mauve/25 flex flex-col overflow-hidden bg-black/20">
			<div className="px-4 pt-5 pb-3 border-b border-mauve/20">
				<h1 className="font-display text-white text-lg">{t('chat.title')}</h1>
			</div>

			<div className="flex-1 overflow-y-auto py-2">
				{friends.length === 0 && (
					<div className="px-4 py-6 text-center font-body text-sm text-white/35">
						{t('chat.noFriendsYet')}
					</div>
				)}
				{friends.map((friend) => (
					<button
						key={friend.id}
						onClick={() => setSelectedFriend(friend)}
						className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left border-l-2 transition-colors ${
							selectedFriend?.id === friend.id
								? 'bg-orange/10 border-orange'
								: 'border-transparent hover:bg-white/5'
						}`}
					>
						<div className="relative shrink-0">
							{friend.avatarFilename ? (
							<img src={`/avatars/${friend.avatarFilename}`} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
						) : (
							<div className="w-9 h-9 rounded-full bg-orange flex items-center justify-center font-body text-[11px] font-bold text-brown-dark shrink-0">
								{initials(friend)}
							</div>
						)}
						{onlineIds.has(friend.id) && (
							<span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-black/50" />
						)}
						</div>
						<span className="font-body text-sm font-semibold text-white truncate">
							{friend.displayName || friend.username}
						</span>
					</button>
				))}
			</div>
		</aside>

		{/* Conversation */}
		<div className="flex flex-col overflow-hidden min-h-0">
			{selectedFriend ? (
				<>
					{/* Header */}
					<div className="px-6 py-3.5 border-b border-mauve/20 flex items-center gap-3 bg-black/25">
						<Link 
							to={`/profile/${selectedFriend.username}`} 
							className="shrink-0"
							aria-label={t('chat.viewProfile', { name: selectedFriend.displayName || selectedFriend.username, defaultValue: `View {{name}}'s profile` })}
						>
							{selectedFriend.avatarFilename ? (
								<img src={`/avatars/${selectedFriend.avatarFilename}`} alt="" className="w-9 h-9 rounded-full object-cover" />	
							) : (
								<div className="w-9 h-9 rounded-full bg-orange flex items-center justify-center font-body text-[11px] font-bold text-brown-dark">
									{initials(selectedFriend)}
								</div>
							)}
						</Link>
						<div>
							<Link
								to={`/profile/${selectedFriend.username}`}
								className="font-body text-sm font-semibold text-white hover:text-orange transition-colors"
							>
								{selectedFriend.displayName || selectedFriend.username}
							</Link>
						<div className="font-body text-[11px] text-white/40">
							{friendIsTyping ? (
								<span className="text-orange">{t('chat.typing')}</span>
							) : isFriendOnline ? (
								<span className="text-green-500">● {t('chat.online')}</span>
							) : (
								t('chat.offline')
							)}
						</div>
					</div>
				</div>

				{/* Messages */}
				<div
					className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-1.5"
					tabIndex={0}
					role="log"
					aria-live="polite"
					aria-relevant="additions"
					aria-label={t('chat.messagesRegion', { defaultValue: 'Message history' })}
				>
					{messages.length === 0 && (
						<div className="flex-1 flex items-center justify-center font-body text-sm text-white/30">
							{t('chat.noMessages')}
						</div>
					)}
					{messages.map((msg) => {
						const isMe = msg.senderId === me?.id
						const isExpanded = expandedMessageId === msg.id

						if (msg.type === 'blindtest' && msg.content) {
							return (
								<div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
									<BlindTestInviteCard sessionId={msg.content} isMe={isMe} />
								</div>
							)
						}
						if (msg.type === 'album' && msg.albumMbid) {
							return (
								<div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
									<AlbumMessageCard mbid={msg.albumMbid} isMe={isMe} />
								</div>
							)
						}
						return (
						<div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
							<button
								onClick={() => setExpandedMessageId(isExpanded ? null : msg.id)}
								aria-expanded={isExpanded}
								// aria-label={t('chat.toggleTimestamp', { defaultValue: 'Show message details' })}
								className={`max-w-[62%] px-3.5 py-2 rounded-xl font-body text-sm text-left focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 ${
									isMe
									? 'bg-orange text-black rounded-br-sm'
									: 'bg-midnight-violet/60 text-white/85 border border-mauve/25 rounded-bl-sm'
								}`}
							>
								{msg.content}
							</button>
							{isExpanded && (
							<div className="flex items-center gap-1 mt-0.5 px-1">
								<span className="font-body text-[10px] text-white/30">{formatTime(msg.createdAt)}</span>
								{isMe && (
									<span className={`font-body text-[10px] ${msg.isRead ? 'text-orange' : 'text-white/20'}`}>
										{msg.isRead ? '✓✓' : '✓'}
									</span>
								)}
							</div>
						)}
						</div>
					)
				})}
					<div ref={bottomRef} />
				</div>
				
				{friendIsTyping && (
						// <div className="flex items-center gap-1.5 px-1">
						<div aria-hidden="true" className="flex items-center gap-1.5 px-1">
							<span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
							<span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
							<span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
						</div>
				)}

				{/* Input */}
				<div className="px-6 py-4 border-t border-mauve/20 relative">
							{showAlbumSearch && (
								<div className="absolute bottom-full left-6 right-6 mb-2 bg-midnight-violet border border-mauve/30 rounded-lg p-3 max-h-64 overflow-y-auto">
									<input
										value={albumQuery}
										onChange={(e) => setAlbumQuery(e.target.value)}
										placeholder={t('chat.searchAlbumPlaceholder')}
										autoFocus
										className="w-full bg-black/30 border border-mauve/25 rounded px-2.5 py-1.5 text-white font-body text-xs outline-none mb-2"
									/>
									{albumQuery.length >= 2 && albumResults.length === 0 && (
										<div className="py-2 text-center text-xs text-white/40">
											{t('chat.noAlbumsFound')}
										</div>
									)}

									{albumResults.map((album) => (
										<button
											key={album.mbid}
											onClick={() => shareAlbum(album.mbid)}
											className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-white/5 text-left"
										>
											{album.coverArtUrl && (
												<img src={album.coverArtUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />	
											)}
											<div className="min-w-0">
												<div className="font-body text-xs text-white truncate">{album.title}</div>
												<div className="font-body text-[10px] text-white/40 truncate">
													{album.artists.map((a) => a.name).join(', ')}
												</div>
											</div>
										</button>
									))}
								</div>
							)}

							<button
								onClick={() => setShowAlbumSearch((s) => !s)}
								className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-orange transition-colors shrink-0"
								title={t('chat.shareAlbum')}
								aria-label={t('chat.shareAlbum')}
							>
								<AlbumIcon className="w-5 h-5" aria-hidden="true" />
							</button>
							<button
							onClick={inviteBlindTest}
							className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-orange transition-colors shrink-0"
							title={t('chat.inviteBlindTest')}
							aria-label={t('chat.inviteBlindTest')}
						>
							<BlindtestIcon className="w-5 h-5" aria-hidden="true" />
						</button>

						<div className="flex gap-2.5 items-end bg-black/25 border border-mauve/25 rounded-lg px-3 py-2.5">
						<textarea
							value={input}
							onChange={(e) => handleInputChange(e.target.value)}
							onKeyDown={handleKey}
							placeholder={t('chat.messagePlaceholder', { name: selectedFriend.displayName || selectedFriend.username })}
							rows={1}
							className="flex-1 bg-transparent border-none outline-none text-white font-body text-sm resize-none max-h-24"
						/>
						<button
							onClick={sendMessage}
							disabled={!input.trim()}
							aria-label={t('chat.send', { defaultValue: 'Send message' })}
							className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
								input.trim() ? 'bg-orange hover:bg-orange/90' : 'bg-white/10'
							}`}
						>
							<svg width="14" height="14" viewBox="0 0 14 14" fill={input.trim() ? '#fff' : 'rgba(255,255,255,0.3)'}>
								<path d="M13 7L1 1 4 7 1 13 13 7z" />
							</svg>
						</button>
					</div>
				</div>
			</>
		) : (
			<div className="flex-1 flex items-center justify-center font-body text-sm text-white/30">
				{t('chat.selectedFriend')}
			</div>
			)}
		</div>
	</div>
	</div>
	)
}
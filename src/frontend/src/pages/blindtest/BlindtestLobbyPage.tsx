import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

interface Friend {
	id: number
	username: string
	displayName?: string | null
	avatarFilename?: string | null
}

function initials(user: Friend) {
	return (user.displayName || user.username).slice(0, 2).toUpperCase()
}

export default function BlindtestLobbyPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const [friends, setFriends] = useState<Friend[]>([])
	const [selectedIds, setSelectedIds] = useState<number[]>([])
	const socketRef = useRef<Socket | null>(null)

	useEffect(() => {
		api.request('/friends').then(setFriends)
	}, [])

	useEffect(() => {
		const socket = io('/', {
			path: '/socket.io',
			withCredentials: true,
			transports: ['websocket'],
		})
		socketRef.current = socket

		return () => {
			socket.disconnect()
		}
	}, [])

	function toggleFriend(friendId: number) {
		setSelectedIds((prev) => {
			if (prev.includes(friendId)) {
				return prev.filter((id) => id !== friendId)
			}
			if (prev.length >= 9) {
				return prev
			}
			return [...prev, friendId]
		})
	}

	function playSolo() {
		const sessionId = crypto.randomUUID()
		navigate(`/blindtest/${sessionId}?mode=solo`)
	}

	function startGroupGame() {
		if (selectedIds.length === 0) return

		const sessionId = crypto.randomUUID()

		selectedIds.forEach((friendId) => {
			socketRef.current?.emit('inviteBlindTest', { receiverId: friendId, sessionId })
		})

		navigate(`/blindtest/${sessionId}?mode=host&invited=${selectedIds.length}`)
	}

	return (
		<div className="p-6 text-white max-w-xl mx-auto">
			<h1 className="text-4xl font-display mb-6 text-center">{t('blindtest.title')}</h1>

			<button
				onClick={playSolo}
				className="w-full bg-orange hover:bg-orange/90 text-black font-semibold px-4 py-3 rounded-lg mb-6"
			>
				{t('blindtest.playSolo')}
			</button>

			<h2 className="text-lg font-display mb-1">{t('blindtest.inviteFriends')}</h2>
			<div className="text-xs text-white/40 mb-3">
				{t('blindtest.selectedCount', { count: selectedIds.length })} {t('blindtest.maxPlayersNote')}
			</div>

			{friends.length === 0 && (
				<div className="text-center text-sm text-white/40 py-6">
					{t('blindtest.noFriendsYet')}
				</div>
			)}

			<div className="flex flex-col gap-1 mb-4">
				{friends.map((friend) => {
					const isSelected = selectedIds.includes(friend.id)
					return (
						<button
							key={friend.id}
							onClick={() => toggleFriend(friend.id)}
							className={`flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors ${
								isSelected ? 'bg-orange/20 border border-orange/50' : 'hover:bg-white/5 border border-transparent'
							}`}
						>
							{friend.avatarFilename ? (
								<img
									src={`/avatars/${friend.avatarFilename}`}
									alt=""
									className="w-9 h-9 rounded-full object-cover shrink-0"
								/>
							) : (
								<div className="w-9 h-9 rounded-full bg-orange flex items-center justify-center text-xs font-bold text-brown-dark shrink-0">
									{initials(friend)}
								</div>
							)}
							<div className="flex-1 min-w-0">
								<div className="text-sm font-semibold truncate">
									{friend.displayName || friend.username}
								</div>
							</div>
							{isSelected && <span className="text-orange text-sm shrink-0">✓</span>}
						</button>
					)
				})}
			</div>

			<button
				onClick={startGroupGame}
				disabled={selectedIds.length === 0}
				className={`w-full font-semibold px-4 py-3 rounded-lg ${
					selectedIds.length === 0
						? 'bg-white/10 text-white/40 cursor-not-allowed'
						: 'bg-orange hover:bg-orange/90 text-white'
				}`}
			>
				{t('blindtest.createGame', { count: selectedIds.length + 1 })}
			</button>
		</div>
	)
}
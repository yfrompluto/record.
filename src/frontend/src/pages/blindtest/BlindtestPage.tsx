import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

interface Choice {
	deezerId: number
	title: string
	artist: string
}

interface RoundStartedPayload {
	previewUrl: string
	duration: number
	choices: Choice[]
	roundNumber: number
	totalRounds: number
}

interface PlayerJoinedPayload {
	userId: number
	playerCount: number
	hostUserId: number | null
}

interface PlayerLeftPayload {
	userId: number
	playerCount: number
	hostUserId: number | null
}

interface AnswerResultPayload {
	userId: number
	isCorrect: boolean
	selectedDeezerId: number
}

interface RoundEndedPayload {
	trackTitle: string
	trackArtist: string
}

interface LeaderboardEntry {
	userId: number
	username: string
	displayName: string | null
	score: number
}

const ERROR_KEY_MAP: Record<string, string> = {
	'This game room is full (10 players max)': 'blindtest.errors.roomFull',
	'Time is up for this round': 'blindtest.errors.timeUp',
	'This game is already finished': 'blindtest.errors.gameFinished',
	'Only the host can start the game': 'blindtest.errors.notHost',
}

function CircularTimer({ timeLeft, duration }: { timeLeft: number; duration: number }) {
	const radius = 45
	const circumference = 2 * Math.PI * radius
	const progress = duration > 0 ? timeLeft / duration : 0
	const offset = circumference * (1 - progress)

	const color = progress > 0.5 ? '#8A7F2E' : progress > 0.25 ? '#e5603b' : '#9d0000f5'

	return (
		<svg width="100" height="100" viewBox="0 0 100 100" className="mx-auto mb-4">
			<circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
			<circle
				cx="50"
				cy="50"
				r={radius}
				fill="none"
				stroke={color}
				strokeWidth="8"
				strokeDasharray={circumference}
				strokeDashoffset={offset}
				strokeLinecap="round"
				transform="rotate(-90 50 50)"
				style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s linear' }}
			/>
			<text
				x="50"
				y="50"
				textAnchor="middle"
				dominantBaseline="central"
				fontSize="28"
				fontWeight="bold"
				fill="white"
			>
				{timeLeft}
			</text>
		</svg>
	)
}

export default function BlindtestPage() {
	const { t } = useTranslation()
	const { sessionId } = useParams<{ sessionId: string }>()
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()
	const { user: me, loading } = useAuth()

	const mode = searchParams.get('mode')
	const isSolo = mode === 'solo'
	const invitedParam = searchParams.get('invited')
	const requiredPlayers = isSolo ? 1 : invitedParam !== null ? parseInt(invitedParam, 10) + 1 : 2

	const socketRef = useRef<Socket | null>(null)
	const soloStartedRef = useRef(false)

	const [playerCount, setPlayerCount] = useState(1)
	const [hostUserId, setHostUserId] = useState<number | null>(null)
	const [gameStarted, setGameStarted] = useState(false)
	const [currentRound, setCurrentRound] = useState<RoundStartedPayload | null>(null)
	const [roundInfo, setRoundInfo] = useState<{ current: number; total: number } | null>(null)
	const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
	const [answered, setAnswered] = useState(false)
	const [lastResult, setLastResult] = useState<AnswerResultPayload | null>(null)
	const [roundEnd, setRoundEnd] = useState<RoundEndedPayload | null>(null)
	const [timeLeft, setTimeLeft] = useState<number>(0)
	const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null)
	const [errorMsg, setErrorMsg] = useState<string | null>(null)

	const amIHost = hostUserId !== null && hostUserId === me?.id

	useEffect(() => {
		if (!sessionId) return

		const socket = io('/', {
			path: '/socket.io',
			withCredentials: true,
			transports: ['websocket'],
		})
		socketRef.current = socket

		socket.on('connect', () => {
			socket.emit('joinBlindtestRoom', { sessionId })
		})

		socket.on('playerJoined', (data: PlayerJoinedPayload) => {
			setPlayerCount(data.playerCount)
			setHostUserId(data.hostUserId)

			if (isSolo && data.hostUserId === me?.id && !soloStartedRef.current) {
				soloStartedRef.current = true
				socket.emit('startGame', { sessionId })
			}
		})

		socket.on('playerLeft', (data: PlayerLeftPayload) => {
			setPlayerCount(data.playerCount)
			setHostUserId(data.hostUserId)
		})

		socket.on('roundStarted', (data: RoundStartedPayload) => {
			setGameStarted(true)
			setCurrentRound(data)
			setSelectedAnswer(null)
			setAnswered(false)
			setLastResult(null)
			setRoundEnd(null)
			setTimeLeft(data.duration)
			setRoundInfo({ current: data.roundNumber, total: data.totalRounds })
		})

		socket.on('answerResult', (data: AnswerResultPayload) => {
			if (data.userId === me?.id) {
				setLastResult(data)
			}
		})

		socket.on('roundEnded', (data: RoundEndedPayload) => {
			setRoundEnd(data)
		})

		socket.on('gameEnded', (data: { leaderboard: LeaderboardEntry[] }) => {
			setLeaderboard(data.leaderboard)
		})

		socket.on('error', (data: { message: string }) => {
			const key = ERROR_KEY_MAP[data.message]
			setErrorMsg(key ? t(key) : t('blindtest.errors.generic'))

			setTimeout(() => {
				setErrorMsg(null)
			}, 4000)
		})

		return () => {
			socket.disconnect()
		}
	}, [sessionId, me, isSolo, t])

	useEffect(() => {
		if (!currentRound || timeLeft <= 0) return
		const interval = setInterval(() => {
			setTimeLeft((tVal) => Math.max(0, tVal - 1))
		}, 1000)
		return () => clearInterval(interval)
	}, [currentRound, timeLeft])

	function handleStartGame() {
		socketRef.current?.emit('startGame', { sessionId })
	}

	function handleSelectAnswer(deezerId: number) {
		if (answered) return
		setSelectedAnswer(deezerId)
		setAnswered(true)
		socketRef.current?.emit('submitAnswer', { sessionId, selectedDeezerId: deezerId })
	}

	function handleLeave() {
		socketRef.current?.emit('leaveGame', { sessionId })
		socketRef.current?.disconnect()
		navigate('/home')
	}

	function getChoiceClasses(deezerId: number): string {
		const isSelected = selectedAnswer === deezerId

		if (isSelected) {
			return 'border'
		}

		return 'bg-black/20 border-mauve/25 hover:bg-white/5 border'
	}

	function getChoiceStyle(deezerId: number): React.CSSProperties {
		const isSelected = selectedAnswer === deezerId

		if (isSelected && lastResult) {
			return lastResult.isCorrect
				? { backgroundColor: '#8A7F2E', borderColor: '#8A7F2E' }
				: { backgroundColor: '#9d0000f5', borderColor: '#9d0000f5' }
		}

		if (isSelected) {
			return { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.4)' }
		}

		return {}
	}

	if (loading) {
		return <div className="p-6 text-white">Chargement...</div>
	}

	if (leaderboard) {
		return (
			<div className="p-6 text-white">
				<h1 className="text-2xl font-display mb-4">{t('blindtest.gameOver')}</h1>
				<ol className="space-y-2 mb-6">
					{leaderboard.map((p, i) => (
						<li key={p.userId} className="flex justify-between bg-black/20 px-4 py-2 rounded-lg">
							<span>{i + 1}. {p.displayName || p.username}</span>
							<span className="font-bold">{p.score} pts</span>
						</li>
					))}
				</ol>
				<button
					onClick={() => navigate('/home')}
					className="bg-orange hover:bg-orange/90 text-black font-semibold px-4 py-2 rounded-lg"
				>
					{t('blindtest.quit')}
				</button>
			</div>
		)
	}

	return (
		<div className="p-6 text-white max-w-xl mx-auto">
			<h1 className="text-4xl font-display mb-6 text-center">{t('blindtest.title')}</h1>

			<button
				onClick={handleLeave}
				className="fixed top-20 left-6 text-sm text-white/60 bg-black/30 px-3 py-1.5 rounded-lg hover:bg-black/50"
			>
				{t('blindtest.quit')}
			</button>

			{errorMsg && (
				<div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 mb-4 text-sm">
					{errorMsg}
				</div>
			)}

			<div className="fixed bottom-24 right-6 text-sm text-white/60 bg-black/30 px-3 py-1.5 rounded-lg">
				{t('blindtest.playersPresent', { count: playerCount })}
			</div>

			{roundInfo && (
				<div className="fixed top-20 right-6 text-sm text-white/60 bg-black/30 px-3 py-1.5 rounded-lg">
					{t('blindtest.round', { current: roundInfo.current, total: roundInfo.total })}
				</div>
			)}

			{!gameStarted && amIHost && !isSolo && (
				<div className="text-center">
					<div className="text-sm text-white/60 mb-3">
						{t('blindtest.playersJoined', { count: playerCount })}
					</div>
					<button
						onClick={handleStartGame}
						disabled={playerCount < requiredPlayers}
						className={`px-4 py-2 rounded-lg font-semibold ${
							playerCount < requiredPlayers
								? 'bg-white/10 text-white/40 cursor-not-allowed'
								: 'bg-orange hover:bg-orange/90 text-black'
						}`}
					>
						{t('blindtest.startGame')}
					</button>
				</div>
			)}

			{!gameStarted && !amIHost && !isSolo && (
				<div className="text-center text-sm text-white/60">
					{t('blindtest.waitingForHost')}
				</div>
			)}

			{currentRound && (
				<div className="mt-4">
					<audio autoPlay src={currentRound.previewUrl} />
					<CircularTimer timeLeft={timeLeft} duration={currentRound.duration} />
					<div className="grid grid-cols-1 gap-2">
						{currentRound.choices.map((choice) => (
							<button
								key={choice.deezerId}
								onClick={() => handleSelectAnswer(choice.deezerId)}
								disabled={answered}
								style={getChoiceStyle(choice.deezerId)}
								className={`px-4 py-2 rounded-lg text-left transition-colors ${getChoiceClasses(choice.deezerId)}`}
							>
								{choice.title} — {choice.artist}
							</button>
						))}
					</div>

					{roundEnd && (
						<div className="mt-4 bg-black/20 rounded-lg p-4">
							<div className="text-sm text-white/60 mb-1">{t('blindtest.correctAnswerWas')}</div>
							<div className="text-lg font-bold">{roundEnd.trackTitle} — {roundEnd.trackArtist}</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
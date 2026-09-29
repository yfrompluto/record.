// ========================================================
//		Playlists page - retrieves all of a user's playlists
// ========================================================

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

export interface PlaylistSummary {
	id: number
	title: string
	description: string | null
	visibility: 'PUBLIC' | 'PRIVATE'
	createdAt: string
	_count: { albums: number }
}

interface PlaylistAlbumEntry {
	id: number
	albumId: number
	addedAt: string
	album: {
		mbid: string
		title: string
		artists?: { name: string }[] | null
	}
}

function truncateDescription(text: string, max = 100): string {
	if (text.length <= max) return text
	return text.slice(0, max).trimEnd() + '…'
}

function entryLabel(
	entry: PlaylistAlbumEntry,
	t: (key: string, opts?: Record<string, unknown>) => string
): { title: string; subtitle: string } {
	const artists = entry.album.artists?.map((a) => a.name).join(', ')
	return {
		title: entry.album.title,
		subtitle: artists && artists.length > 0 ? artists : t('common.unknownArtist'),
	}
}

function LockIcon({ locked, size = 14 }: { locked: boolean; size?: number }) {
	return locked ? (
		<svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<rect x="5" y="11" width="14" height="9" rx="1.5" />
			<path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
		</svg>
	) : (
		<svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<rect x="5" y="11" width="14" height="9" rx="1.5" />
			<path d="M8 11V7a4 4 0 0 1 7.4-2" strokeLinecap="round" />
		</svg>
	)
}

interface PlaylistCardProps {
	playlist: PlaylistSummary
	isOwner: boolean
	isOpen: boolean
	onOpen: () => void
	onClose: () => void
	onDelete: () => void
}

export default function Playlists({ playlist, isOwner, isOpen, onOpen, onClose, onDelete }: PlaylistCardProps) {
	const { t } = useTranslation()
	const containerRef = useRef<HTMLDivElement>(null)

	const [visibility, setVisibility] = useState(playlist.visibility)
	const [title, setTitle] = useState(playlist.title)
	const [description, setDescription] = useState(playlist.description)

	const [entries, setEntries] = useState<PlaylistAlbumEntry[] | null>(null)
	const [loadingEntries, setLoadingEntries] = useState(false)
	const [entriesError, setEntriesError] = useState<string | null>(null)

	const [editing, setEditing] = useState(false)
	const [editTitle, setEditTitle] = useState(playlist.title)
	const [editDescription, setEditDescription] = useState(playlist.description || '')
	const [saving, setSaving] = useState(false)
	const [saveError, setSaveError] = useState<string | null>(null)

	useEffect(() => {
		if (!isOpen || entries !== null) return
		let cancelled = false
		setLoadingEntries(true)
		setEntriesError(null)
		api
			.getPlaylist(playlist.id)
			.then((data) => {
				if (!cancelled) setEntries(data.albums ?? [])
			})
			.catch(() => {
				if (!cancelled) {
					setEntriesError(t('playlists.panel.errors.loadFailed', { defaultValue: "Couldn't load this playlist." }))
				}
			})
			.finally(() => {
				if (!cancelled) setLoadingEntries(false)
			})
		return () => {
			cancelled = true
		}
	}, [isOpen, entries, playlist.id, t])

	useEffect(() => {
		if (!isOpen || editing) return

		function handlePointerDown(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				onClose()
			}
		}
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') 
				onClose()
		}

		document.addEventListener('mousedown', handlePointerDown)
		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('mousedown', handlePointerDown)
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [isOpen, editing, onClose])

	async function handleToggleVisibility(e: React.MouseEvent) {
		e.stopPropagation()
		if (!isOwner) return
		const previous = visibility
		const next = previous === 'PRIVATE' ? 'PUBLIC' : 'PRIVATE'
		setVisibility(next)
		try {
			await api.updatePlaylist(playlist.id, { visibility: next })
		} catch {
			setVisibility(previous)
		}
	}

	async function handleSave() {
		setSaveError(null)
		if (!editTitle.trim()) {
			setSaveError(t('playlists.errors.titleRequired', { defaultValue: 'A title is required.' }))
			return
		}
		setSaving(true)
		try {
			await api.updatePlaylist(playlist.id, {
				title: editTitle.trim(),
				description: editDescription.trim() || null,
			})
			setTitle(editTitle.trim())
			setDescription(editDescription.trim() || null)
			setEditing(false)
		} catch {
			setSaveError(t('playlists.errors.saveFailed', { defaultValue: "Couldn't save changes." }))
		} finally {
			setSaving(false)
		}
	}

	function handleDeleteClick() {
		const confirmed = window.confirm(
			t('playlists.panel.deleteConfirm', {
				title,
				defaultValue: `Delete "${title}"? This will remove it for everyone and cannot be undone.`,
			})
		)
		if (confirmed) 
			onDelete()
	}

	const isPrivate = visibility === 'PRIVATE'

	return (
		<div
			ref={containerRef}
			className="border border-mauve/20 rounded-lg hover:border-mauve/40 transition-colors overflow-hidden h-fit"
		>
			<div className="p-3">
				<div className="font-display text-lg tracking-wide leading-tight truncate">{title}</div>
				{description && (
					<div className="font-body text-sm text-white/60 truncate">{truncateDescription(description)}</div>
				)}
			</div>

			{isOpen && (
				<div id={`playlist-panel-${playlist.id}`} className="px-3 pb-3 pt-1 border-t border-mauve/10 flex flex-col gap-4">
					{editing ? (
						<div className="flex flex-col gap-3 mt-3">
							<div>
								<label htmlFor={`edit-title-${playlist.id}`} className="sr-only">
									{t('playlists.form.titleLabel', { defaultValue: 'Title' })}
								</label>
								<input
									id={`edit-title-${playlist.id}`}
									type="text"
									value={editTitle}
									onChange={(e) => setEditTitle(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') 
											handleSave()
									}}
									className="w-full bg-black/30 rounded p-2 text-sm text-white/70 placeholder:text-white/30 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
								/>
							</div>
							<div>
								<label htmlFor={`edit-desc-${playlist.id}`} className="sr-only">
									{t('playlists.form.descriptionLabel', { defaultValue: 'Description (optional)' })}
								</label>
								<input
									id={`edit-desc-${playlist.id}`}
									type="text"
									maxLength={100}
									placeholder={t('playlists.form.descriptionLabel', { defaultValue: 'Description (optional)' })}
									value={editDescription}
									onChange={(e) => setEditDescription(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') 
											handleSave()
									}}
									className="w-full bg-black/30 rounded p-2 text-sm text-white/70 placeholder:text-white/30 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
								/>
								<div className="text-right font-body text-[13px] text-white/30 mt-0.5">
									{editDescription.length}/100
								</div>
							</div>
							{saveError && (
								<p role="alert" className="text-orange/80 text-xs">
									{saveError}
								</p>
							)}
							<div className="flex items-center gap-4 text-xs">
								<button
									onClick={handleSave}
									disabled={saving}
									className="text-orange disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
								>
									{saving
										? t('playlists.form.saving', { defaultValue: 'Saving...' })
										: t('playlists.form.save', { defaultValue: 'Save' })}
								</button>
								<button
									onClick={() => {
										setEditing(false)
										setEditTitle(title)
										setEditDescription(description || '')
										setSaveError(null)
									}}
									className="text-white/60 hover:text-white focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
								>
									{t('playlists.form.cancel', { defaultValue: 'Cancel' })}
								</button>
							</div>
						</div>
					) : (
						<div>
							<div className="border-t border-white/60 my-2" />
							{entriesError ? (
								<p role="alert" className="font-body text-xs text-orange/80">
									{entriesError}
								</p>
							) : loadingEntries || entries === null ? (
								<p className="font-body text-xs text-white/25 italic">
									{t('playlists.panel.loading', { defaultValue: 'Loading...' })}
								</p>
							) : entries.length === 0 ? (
								<p className="font-body text-xs text-white/25 italic">
									{t('playlists.panel.empty', { defaultValue: 'No tracks yet.' })}
								</p>
							) : (
								<ul className="flex flex-col gap-1">
									{entries.map((entry: PlaylistAlbumEntry) => {
										const { title: entryTitle, subtitle } = entryLabel(entry, t)
										return (
											<li key={entry.id} className="py-1 border-b border-white/5 last:border-0">
												<Link
													to={`/albums/${entry.album.mbid}`}
													className="block hover:opacity-80 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
												>
													<span className="font-body text-sm text-white/70 truncate block">{entryTitle}</span>
													<span className="font-body text-xs text-white/35 truncate block">{subtitle}</span>
												</Link>
											</li>
										)
									})}
								</ul>
							)}
						</div>
					)}

					{isOwner && !editing && (
						<button
							onClick={() => setEditing(true)}
							className="self-start font-body text-xs text-white/60 hover:text-white focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
						>
							{t('playlists.panel.edit', { defaultValue: 'Edit' })}
						</button>
					)}
				</div>
			)}

			<div className="flex items-center justify-between px-3 pb-2.5">
				{isOwner ? (
					<button
						type="button"
						onClick={handleToggleVisibility}
						aria-pressed={isPrivate}
						aria-label={
							isPrivate
								? t('playlists.makePublic', { defaultValue: 'Make playlist public' })
								: t('playlists.makePrivate', { defaultValue: 'Make playlist private' })
						}
						className={`flex items-center gap-1 rounded hover:opacity-70 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 ${
							isPrivate ? 'text-orange' : 'text-white/55'
						}`}
					>
						<LockIcon locked={isPrivate} />
					</button>
				) : (
					<span />
				)}

				<div className="flex items-center gap-4">
					{isOwner && isOpen && !editing && (
						<button
							type="button"
							onClick={handleDeleteClick}
							className="font-body text-xs text-white/40 hover:text-orange focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
						>
							{t('playlists.panel.deletePlaylist', { defaultValue: 'Delete playlist' })}
						</button>
					)}
					{!isOpen && (
						<button
							type="button"
							onClick={onOpen}
							className="font-display text-sm leading-none text-orange/80 hover:opacity-60 px-3 h-6 flex items-center justify-center whitespace-nowrap"
							aria-expanded="false"
							aria-controls={`playlist-panel-${playlist.id}`}
						>
							{t('playlists.viewPlaylist', { defaultValue: 'View playlist' })}
						</button>
					)}
				</div>
			</div>
		</div>
	)
}
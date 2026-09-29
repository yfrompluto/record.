import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../services/api";
import StarRating from "./Rating";

export interface AlbumArtist {
	mbid: string;
	name: string;
}

export interface AlbumTrack {
	mbid: string;
	title: string;
	position: number;
}

export interface AlbumDetail {
	mbid: string;
	title: string;
	releaseDate?: string;
	releaseYear?: number;
	coverArtUrl: string | null;
	artists: AlbumArtist[];
	tracks: AlbumTrack[];
}

interface Playlist {
	id: number;
	title: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AlbumPageContentProps {
	album: AlbumDetail;
	onClose: () => void;
}

// utils - check and plus svg icons
function PlusIcon() {
	return (
		<svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
			<circle cx="12" cy="12" r="10" className="fill-none stroke-current" strokeWidth="1.5" />
			<path d="M12 7v10M7 12h10" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" />
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
			<path
			d="M5 13l4 4L19 7"
			className="fill-none stroke-current"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			/>
		</svg>
	);
}

// access compliance
const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function AlbumPageContent({
	album,
	onClose,
}: AlbumPageContentProps) {
	const { t } = useTranslation();

	const [reviewOpen, setReviewOpen] = useState(false);
	const [tracklistOpen, setTracklistOpen] = useState(false);

	const [albumRating, setAlbumRating] = useState(0);
	const [trackRatings, setTrackRatings] = useState<Record<string, number>>({});

	const [savedAlbumRating, setSavedAlbumRating] = useState(0);
	const [savedTrackRatings, setSavedTrackRatings] = useState<Record<string, number>>({});

	const [review, setReview] = useState("");
	const [savedReview, setSavedReview] = useState<string | null>(null);

	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const [saveErrorDetail, setSaveErrorDetail] = useState<string | null>(null);

	const [isInCollection, setIsInCollection] = useState(false);
	const [collectionError, setCollectionError] = useState<string | null>(null);
	const [coverFailed, setCoverFailed] = useState(false)

	const [playlists, setPlaylists] = useState<Playlist[]>([]);
	const [playlistsLoading, setPlaylistsLoading] = useState(false);
	const [albumPlaylistIds, setAlbumPlaylistIds] = useState<Set<number>>(new Set());
	const [playlistErrors, setPlaylistErrors] = useState<Record<number, string>>({});
	const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false);
	const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
	const [newPlaylistName, setNewPlaylistName] = useState("");
	const [creatingPlaylistPending, setCreatingPlaylistPending] = useState(false);
	const [newPlaylistError, setNewPlaylistError] = useState<string | null>(null);
	const playlistMenuRef = useRef<HTMLDivElement>(null);

	const [pendingPlaylistIds, setPendingPlaylistIds] = useState<Set<number>>(new Set());

	const dialogRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const previouslyFocusedRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
			setAlbumRating(0);
			setSavedAlbumRating(0);
			setTrackRatings({});
			setSavedTrackRatings({});
			setReview("");
			setSavedReview(null);
			setSaveStatus("idle");
			setTracklistOpen(false);
			setReviewOpen(false);
			setIsInCollection(false);
			setCollectionError(null);
			setAlbumPlaylistIds(new Set());
			setPlaylistErrors({});
			setPlaylistMenuOpen(false);
			setIsCreatingPlaylist(false);
			setNewPlaylistName("");
			setNewPlaylistError(null);
			setCoverFailed(false);

			let cancelled = false;

			api
				.isInCollectionCheck(album.mbid)
				.then((result) => {
					if (!cancelled)
						setIsInCollection(Boolean(result));
				})
				.catch(() => {
					if (!cancelled)
						setIsInCollection(false);
				});

			setPlaylistsLoading(true);
			api
				.listMyPlaylists()
				.then((data) => {
					if (!cancelled)
						setPlaylists(Array.isArray(data) ? data : []);
				})
				.catch(() => {
					if (!cancelled)
						setPlaylists([]);
				})
				.finally(() => {
					if (!cancelled)
						setPlaylistsLoading(false);
				});

			api
				.getAlbumRating(album.mbid)
				.then((rating) => {
					if (cancelled || !rating)
						return;
					setAlbumRating(rating.score);
					setSavedAlbumRating(rating.score);
					setReview(rating.review ?? "");
					setSavedReview(rating.review ?? null);
					if (rating.review) setReviewOpen(true);
				})
				.catch(() => {
				});

			api
				.getTrackRatings(album.mbid)
				.then((ratings) => {
					if (cancelled)
						return;
					setTrackRatings(ratings ?? {});
					setSavedTrackRatings(ratings ?? {});
				})
				.catch(() => {
				});

			return () => {
				cancelled = true;
			};
		}, [album.mbid]);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (playlistMenuRef.current && !playlistMenuRef.current.contains(e.target as Node)) {
				setPlaylistMenuOpen(false);
				setIsCreatingPlaylist(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	useEffect(() => {
		previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
		closeButtonRef.current?.focus();

		return () => {
			previouslyFocusedRef.current?.focus();
		};
	}, []);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
				return;
			}

			if (e.key !== "Tab" || !dialogRef.current)
				return;

			const focusable = Array.from(
				dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
			).filter((el) => el.offsetParent !== null);

			if (focusable.length === 0)
				return;

			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	function toggleAlbumRating(score: number) {
		setAlbumRating((prev) => (prev === score ? 0 : score));
		setSaveStatus("idle");
	}

	function toggleTrackRating(trackMbid: string, score: number) {
		setTrackRatings((prev) => ({
			...prev,
			[trackMbid]: prev[trackMbid] === score ? 0 : score,
		}));
		setSaveStatus("idle");
	}

	async function handleToggleCollection() {
		const next = !isInCollection;
		setIsInCollection(next);
		setCollectionError(null);

		try {
			if (next) {
				await api.addToCollection(album.mbid);
			} else {
				await api.removeFromCollection(album.mbid);
			}
		} catch {
			setIsInCollection(!next);
			setCollectionError(t("recpage.collectionError", "An error occurred while managing the collection."));
		}
	}

	async function togglePlaylistMembership(playlist: Playlist) {
		if (pendingPlaylistIds.has(playlist.id))
			return;

		const wasIn = albumPlaylistIds.has(playlist.id);

		setPendingPlaylistIds((prev) => new Set(prev).add(playlist.id));
		setAlbumPlaylistIds((prev) => {
			const next = new Set(prev);
			if (wasIn) next.delete(playlist.id);
			else next.add(playlist.id);
			return next;
		});
		setPlaylistErrors((prev) => {
			const next = { ...prev };
			delete next[playlist.id];
			return next;
		});

		try {
			if (wasIn) {
				await api.removeAlbumFromPlaylist(playlist.id, album.mbid);
			} else {
				await api.addAlbumToPlaylist(playlist.id, album.mbid);
			}
		} catch (err) {
		setAlbumPlaylistIds((prev) => {
			const next = new Set(prev);
			if (wasIn)
				next.add(playlist.id);
			else
				next.delete(playlist.id);
			return next;
		});
			setPlaylistErrors((prev) => ({
				...prev,
				[playlist.id]: t("recpage.playlistUpdateError", "An error occurred while updating the playlist."),
			}));
		} finally {
			setPendingPlaylistIds((prev) => {
				const next = new Set(prev);
				next.delete(playlist.id);
				return next;
			});
		}
	}

	async function handleCreatePlaylist() {
		const name = newPlaylistName.trim();
		if (!name)
			return;

		setCreatingPlaylistPending(true);
		setNewPlaylistError(null);

		try {
			const created: Playlist = await api.createPlaylist({ title: name });
			setPlaylists((prev) => [...prev, created]);
			await api.addAlbumToPlaylist(created.id, album.mbid);
			setAlbumPlaylistIds((prev) => new Set(prev).add(created.id));
			setNewPlaylistName("");
			setIsCreatingPlaylist(false);
		} catch {
			setNewPlaylistError(t("recpage.createPlaylistError", "An error occurred while creating a playlist."));
		} finally {
			setCreatingPlaylistPending(false);
		}
	}

	const isDirty =
		albumRating !== savedAlbumRating ||
		review !== (savedReview ?? "") ||
		Object.keys(trackRatings).some(
			(trackMbid) => (trackRatings[trackMbid] ?? 0) !== (savedTrackRatings[trackMbid] ?? 0)
		);

async function handleSaveState() {
		if (!isDirty)
			return;

		setSaveStatus("saving");
		setSaveErrorDetail(null);

		const mbid = album.mbid;
		const jobs: { key: string; run: () => Promise<unknown> }[] = [];

		if (albumRating !== savedAlbumRating || review !== (savedReview ?? "")) {
			jobs.push({
			key: "album",
			run: () =>
				albumRating === 0
					? api.removeAlbumRating(mbid)
					: api.rateAlbum(mbid, albumRating, review),
			});
		}

		for (const trackMbid of Object.keys(trackRatings)) {
			const current = trackRatings[trackMbid] ?? 0;
			const saved = savedTrackRatings[trackMbid] ?? 0;
			if (current !== saved) {
				jobs.push({
					key: trackMbid,
					run: () =>
						current === 0
						? api.removeTrackRating(mbid, trackMbid)
						: api.rateTrack(mbid, trackMbid, current),
				});
			}
		}

		const results = await Promise.allSettled(jobs.map((job) => job.run()));

		const succeededKeys = new Set<string>();
		let failedCount = 0;
		results.forEach((result, index) => {
			if (result.status === "fulfilled") {
			succeededKeys.add(jobs[index].key);
			} else {
			failedCount += 1;
			}
		});

		if (succeededKeys.has("album")) {
			setSavedAlbumRating(albumRating);
			setSavedReview(review);
		}
		if (succeededKeys.size > 0) {
			setSavedTrackRatings((prev) => {
			const next = { ...prev };
			succeededKeys.forEach((key) => {
				if (key !== "album") next[key] = trackRatings[key] ?? 0;
			});
			return next;
			});
		}

		if (failedCount === 0) {
			setSaveStatus("saved");
			setTimeout(onClose, 600);
		} else {
			setSaveStatus("error");
			setSaveErrorDetail(
				t(
					"recpage.saveErrorGeneric",
					"Couldn't save your rec. Rate the album as a whole, or rate at least one track."
				)
			);
		}
	}

	const sortedTracks = [...album.tracks].sort((a, b) => a.position - b.position);

	// The whole page
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
			onMouseDown={(e) => {
			if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
			ref={dialogRef}
			role="dialog"
			aria-modal="true"
			aria-label={album.title}
			className="relative border border-olive w-full max-w-4xl max-h-[85vh] flex flex-col rounded-lg body text-white shadow-2xl"
			>
			<button
				ref={closeButtonRef}
				onClick={onClose}
				aria-label="Close"
				className="absolute top-4 right-4 text-white/60 hover:text-olive focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded z-10"
			>
				✕
			</button>

			<div className="overflow-y-auto p-6 flex-1">
				<div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-6 mt-2">
					<div className="aspect-square w-full max-w-[137px] rounded bg-mauve/30 overflow-hidden flex items-center justify-center">
						<img
							src={!album.coverArtUrl || coverFailed ? "/icons/def_cover_text.svg" : album.coverArtUrl}
							alt={!album.coverArtUrl || coverFailed ? `${album.title} — no cover available` : `${album.title} cover`}
							className="w-full h-full object-cover"
							onError={() => setCoverFailed(true)}
						/>
					</div>

					<div className="min-w-0">
					<h1 className="font-display text-orange/80 text-3xl leading-tight">
						{album.title}
					</h1>
					<p className="text-white/60 mt-1">
						{album.artists.map((a) => a.name).join(", ") || t("recpage.unknownArtist", "Unknown artist")}
						{album.releaseYear ? ` · ${album.releaseYear}` : ""}
					</p>

					<div className="mt-4 flex flex-wrap items-center gap-4">
						<div className="mr-20">
							<StarRating
								value={albumRating}
								onChange={toggleAlbumRating}
								size="album_stars"
								color="orange"
								label="Rate this album"
							/>
						</div>

						<button
							onClick={handleToggleCollection}
							aria-pressed={isInCollection}
							className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border transition-colors focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 ${
								isInCollection
									? "border-olive/90 text-white/80 text-m bg-olive/70"
									: "border-white/40 text-white/60 hover:border-white/60 hover:text-white/90"
							}`}
						>
							{isInCollection ? <CheckIcon /> : <PlusIcon />}
							{isInCollection ? t("recpage.inCollection", "In collection") : t("recpage.addToCollection", "Add to collection")}
						</button>

						<div className="relative" ref={playlistMenuRef}>
							<button
								onClick={() => setPlaylistMenuOpen((prev) => !prev)}
								aria-expanded={playlistMenuOpen}
								aria-haspopup="true"
								className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border transition-colors focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 ${
									albumPlaylistIds.size > 0
										? "border-olive/90 text-white/80 text-m bg-olive-light/10"
										: "border-white/40 text-white/60 hover:border-white/60 hover:text-white/90"
								}`}
							>
								{albumPlaylistIds.size > 0 ? <CheckIcon /> : <PlusIcon />}
								{albumPlaylistIds.size > 0
									? t("recpage.inPlaylists", "In {{count}} playlist(s)", {
										count: albumPlaylistIds.size,
										defaultValue: `In ${albumPlaylistIds.size} playlist${albumPlaylistIds.size > 1 ? "s" : ""}`,
									})
									: t("recpage.addToPlaylist", "Add to playlist")}
							</button>

							{playlistMenuOpen && (
								<div
									role="group"
									aria-label={t('recpage.playlistsGroupLabel', 'Playlists') as string}
									className="absolute left-0 top-full mt-1 w-56 bg-brown-dark border border-white/10 rounded shadow-lg z-20 py-1"
								>
									{playlistsLoading && (
											<p className="px-3 py-2 text-white/60 text-xs">{t("recpage.loadingPlaylists", "Loading playlists…")}</p>
									)}

									{!playlistsLoading && playlists.length === 0 && (
											<p className="px-3 py-2 text-white/60 text-xs">{t("recpage.noPlaylists", "No playlists yet.")}</p>
									)}

									{!playlistsLoading && (
											<ul>
												{playlists.map((playlist) => {
													const isChecked = albumPlaylistIds.has(playlist.id);
													return (
															<li key={playlist.id}>
																<button
																	type="button"
																	onClick={() => togglePlaylistMembership(playlist)}
																	disabled={pendingPlaylistIds.has(playlist.id)}
																	aria-pressed={isChecked}
																	className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-left text-white/70 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 disabled:opacity-50"
																>
																	<span className="truncate">{playlist.title}</span>
																	{isChecked && <CheckIcon />}
																</button>
																{playlistErrors[playlist.id] && (
																	<p className="px-3 pb-1 text-orange text-xs" role="alert">
																			{playlistErrors[playlist.id]}
																	</p>
																)}
															</li>
													);
												})}
											</ul>
									)}

									<div className="border-t border-white/10 mt-1 pt-1 px-2">
										{isCreatingPlaylist ? (
											<div>
												<div className="flex items-center gap-1.5 py-1">
													<label htmlFor="new-playlist-name" className="sr-only">
														Playlist name
													</label>
													<input
														id="new-playlist-name"
														autoFocus
														type="text"
														value={newPlaylistName}
														onChange={(e) => setNewPlaylistName(e.target.value)}
														onKeyDown={(e) => {
															if (e.key === "Enter")
																handleCreatePlaylist();
															if (e.key === "Escape") {
																e.stopPropagation();
																setIsCreatingPlaylist(false);
																setNewPlaylistName("");
																setNewPlaylistError(null);
															}
														}}
														disabled={creatingPlaylistPending}
														placeholder={t("recpage.playlistNamePlaceholder", "Playlist name") as string}
														className="flex-1 min-w-0 bg-black/30 rounded px-2 py-1 text-xs text-white placeholder-white/40 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 disabled:opacity-50"
													/>
													<button
														type="button"
														onClick={handleCreatePlaylist}
														disabled={creatingPlaylistPending}
														aria-label="Create playlist"
														className="text-mustard hover:text-orange focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded shrink-0 disabled:opacity-50"
													>
														<CheckIcon />
													</button>
												</div>
												{newPlaylistError && (
													<p className="text-orange text-xs pb-1" role="alert">
														{newPlaylistError}
													</p>
												)}
											</div>
										) : (
											<button
												type="button"
												onClick={() => setIsCreatingPlaylist(true)}
												className="w-full flex items-center gap-1.5 px-1 py-1.5 text-sm text-white/60 hover:text-orange focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
											>
												<PlusIcon />
												{t("recpage.newPlaylist", "New playlist")}
											</button>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
					{(collectionError) && (
						<p className="text-orange text-xs mt-1" role="alert">
							{collectionError}
						</p>
					)}

					<hr className="border-white/10 my-5" />

					<button
						onClick={() => setTracklistOpen((prev) => !prev)}
						className="font-display text-white/70 text-m tracking-wide uppercase hover:text-mustard focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
						aria-expanded={tracklistOpen}
					>
						{t("recpage.tracklist", "Tracklist")} {tracklistOpen ? "▾" : "▸"}
					</button>

					{tracklistOpen && (
						<div className="mt-3">
							{sortedTracks.length === 0 ? (
							<p className="text-white/90 text-sm">{t("recpage.noTracklist", "No tracklist available.")}</p>
							) : (
							<ol className="space-y-2">
								{sortedTracks.map((track) => (
									<li key={track.mbid} className="flex items-center gap-3 text-sm">
									<span className="text-white/60 tabular-nums text-right">
										{track.position}.
									</span>
									<span className="flex-1 truncate text-white/80">{track.title}</span>
									<StarRating
										value={trackRatings[track.mbid] ?? 0}
										onChange={(score) => toggleTrackRating(track.mbid, score)}
										size="track_stars"
										color="mustard"
										label={`Rate ${track.title}`}
									/>
									</li>
								))}
							</ol>
							)}
						</div>
					)}

					<hr className="border-white/10 my-5" />

					<button
						onClick={() => setReviewOpen((prev) => !prev)}
						className="font-body text-sm border-white/40 text-white/60 hover:border-white/60 hover:text-white/90 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
						aria-expanded={reviewOpen}
					>
						{reviewOpen ? t("recpage.hideReview", "- Hide review") : t("recpage.addReview", "+ Add review")}
					</button>

					{reviewOpen && (
						<div className="mt-3">
							<label htmlFor="album-review" className="sr-only">
								{t("recpage.reviewLabel", "Your review of this album")}
							</label>
							<textarea
							id="album-review"
							value={review}
							onChange={(e) => {
								setReview(e.target.value);
								setSaveStatus("idle");
							}}
							placeholder={t("recpage.reviewPlaceholder", "My thoughts on this album..") as string}
							className="w-full h-20 bg-black/30 rounded p-2 text-sm text-white/60 placeholder-white/40 resize-none focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
							onKeyDown={(e) => {
							if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
								e.currentTarget.blur();
							}
							if (e.key === "Escape") {
								e.stopPropagation();
								e.currentTarget.blur();
							}
						}}
							/>
						</div>
					)}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-3 px-6 py-3 border-t border-white/10">
				<button
					onClick={handleSaveState}
					disabled={!isDirty || saveStatus === "saving"}
					className="font-body text-sm px-4 py-1.5 rounded bg-olive/90 text-white/70 font-semibold disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed hover:bg-olive/40 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
				>
					{saveStatus === "saving" ? t("recpage.saving", "Rec") : t("recpage.recIt", "Rec it!")}
				</button>

				<div aria-live="polite">
					{saveStatus === "saved" && !isDirty && (
						<span className="font-body text-white/40 text-xs">
							{t("recpage.recVisibleNotice", "This rec will be visible on your public profile!")}
						</span>
					)}
				</div>
				{saveStatus === "error" && (
					<span className="text-orange text-xs" role="alert">
					{saveErrorDetail}
					</span>
				)}
			</div>
			</div>
		</div>
	);
}
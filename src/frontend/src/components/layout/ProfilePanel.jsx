// ========================================================================
//    ProfilePanel: overlay panel showing the current user's profile.
//    Two modes: "view" (read-only, default) and "edit" (editable fields).
//    Avatar upload happens immediately on file selection, independent
//    from the displayName/bio form which requires explicit save.
// ========================================================================

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import api from "../../services/api";
import { useTranslation } from "react-i18next";

export default function ProfilePanel({ onClose, initialMode = "view" }) {
	const { t } = useTranslation();
	const { user, checkAuth, logout } = useAuth();
	const { notifications } = useNotifications();
	const navigate = useNavigate();
	const fileInputRef = useRef(null);
	const panelRef = useRef(null);

	const [mode, setMode] = useState(initialMode);
	const [displayName, setDisplayName] = useState(user?.displayName ?? "");
	const [bio, setBio] = useState(user?.bio ?? "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const [stats, setStats] = useState({
		totalRatings: 0,
		totalCollected: 0,
		totalPlaylists: 0,
		averageRating: null,
		favoriteArtist: null,
	});

	useEffect(() => {
		api.getMyStats().then(setStats).catch(() => {});
	}, []);

	useEffect(() => {
		if (initialMode === "edit" && mode === "view") {
			setDisplayName(user?.displayName ?? "");
			setBio(user?.bio ?? "");
			setError(null);
		}
	}, [initialMode, user])

	useEffect(() => {
    		const previouslyFocused = document.activeElement;
		panelRef.current?.focus();

	function handleKeyDown(e) {
      	if (e.key === "Escape") {
				onClose();
				return;
      	}
		if (e.key !== "Tab")
			return;

		const focusable = panelRef.current?.querySelectorAll(
      		'button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      	);
	      if (!focusable || focusable.length === 0)
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
    	return () => {
      	document.removeEventListener("keydown", handleKeyDown);
      	previouslyFocused?.focus();
   		};
	}, [onClose]);
	
	const avatarSrc = user?.avatarFilename
		? `/avatars/${user.avatarFilename}`
		: "/def_avatar.svg";

     // Reset current info in case a previous edit was cancelled without a page refresh
	function enterEditMode() {
		setDisplayName(user?.displayName ?? "");
		setBio(user?.bio ?? "");
		setError(null);
		setMode("edit");
  	}

	async function handleAvatarChange(e) {
		const file = e.target.files[0];
		if (!file)
			return;
		try {
			await api.uploadAvatar(file);
			await checkAuth();
		} catch (err) {
			setError(t("profilePanel.errors.avatarUploadFailed"));
		} finally {
			e.target.value = "";
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setSaving(true);
		setError(null);
		try {
			await api.updateProfile({ displayName, bio });
			await checkAuth();
			setMode("view");
		} catch (err) {
			setError(t("profilePanel.errors.saveFailed"));
		} finally {
			setSaving(false);
		}
	}

	async function handleLogout() {
		await logout();
		navigate("/login");
	}

	return (
		<div
			className="fixed inset-0 z-[100] bg-black/40"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>

			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-label={t("profilePanel.dialogLabel")}
				tabIndex={-1}
				className="box-border flex flex-col fixed top-0 right-0 h-screen w-[40.666%] bg-gradient-to-t from-olive via-brown-dark to-black text-white font-body p-8 shadow-[-4px_0_20px_rgba(0,0,0,0.4)]"
			>
			<div className="flex items-center justify-between pb-4 -mx-8 px-8 border-b border-white/40">
				{mode === "view" ? (
					<button
						className="flex items-center gap-1.5 bg-transparent border border-orange rounded-full px-4 py-1.5 text-orange font-body text-[0.6rem] tracking-widest uppercase cursor-pointer transition-colors hover:bg-orange hover:text-black"
						onClick={enterEditMode}
					>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
							<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
						</svg>
						{t("profilePanel.editProfile")}

					</button>
				) : (
					<button
						className="bg-transparent border-none text-white cursor-pointer flex items-center justify-center p-1 transition-opacity hover:opacity-70"
						onClick={() => setMode("view")}
						aria-label={t("profilePanel.backToView")}
					>
						<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
							<line x1="19" y1="12" x2="5" y2="12" />
							<polyline points="12 19 5 12 12 5" />
						</svg>
					</button>
				)}

				<button
					className="bg-transparent border-none text-white text-2xl cursor-pointer leading-none"
					onClick={onClose}
					aria-label={t("profilePanel.closePanel")}
				>
					✕
				</button>
			</div>

			<div className="flex-1 overflow-y-auto">
				<div className="grid grid-cols-3 items-center mt-10 mb-1">
					<div />

					<div className="flex justify-center">
					{mode === "edit" ? (
						<div className="relative w-24 h-24 rounded-full group">
							<img src={avatarSrc} alt="My profile picture" className="w-24 h-24 rounded-full object-cover block border border-white/40" />
							<button
								type="button"
								className="absolute inset-0 flex items-center justify-center bg-black/55 border-none rounded-full text-white cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
								onClick={() => fileInputRef.current.click()}
								aria-label={t("profilePanel.updatePicture")}
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
									<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
									<circle cx="12" cy="13" r="4" />
								</svg>
							</button>
						</div>
					) : (
						<img src={avatarSrc} alt="My profile picture" className="w-24 h-24 rounded-full object-cover block border border-white/40" />
					)}
					</div>

					<div />
				</div>

				<div className="flex flex-col items-center mb-1">
					{mode === "view" && user?.displayName && (
						<p className="mt-3 font-display text-xl text-white">{user.displayName}</p>
					)}

					{mode === "edit" && (
						<>
							<label htmlFor="avatar-upload" className="mt-3 text-[0.62rem] tracking-widest uppercase text-white/60 cursor-pointer">
								{t("profilePanel.update")}
							</label>
							<input
								id="avatar-upload"
								type="file"
								ref={fileInputRef}
								onChange={handleAvatarChange}
								accept="image/png,image/jpeg,image/webp"
								hidden
							/>
						</>
					)}
				</div>

				{mode === "view" ? (
					<div className="flex flex-col gap-1">
						<div className="text-center px-5">
							<p className="font-body italic text-sm leading-relaxed text-white">
								{user?.bio || t("profilePanel.noBio")}
							</p>
						</div>

						<h2 className="sr-only">{t("profilePanel.stats.sectionTitle")}</h2>
						<div className="flex flex-col gap-3 mt-4">
							<div className="flex justify-between border border-white/40 rounded-xl px-2 py-4 bg-white/[0.02]">
								<div className="flex-1 flex flex-col items-center gap-1">
									<span className="font-display font-bold text-lg text-white">{stats.totalRatings}</span>
									<span className="text-[0.8rem] tracking-widest uppercase text-white/70">{t("profilePanel.stats.ratings")}</span>
								</div>
								<div className="flex-1 flex flex-col items-center gap-1">
									<span className="font-display font-bold text-lg text-white">
										{stats.averageRating != null ? `${stats.averageRating} ★` : '—'}
									</span>
									<span className="text-[0.8rem] tracking-widest uppercase text-white/70">{t("profilePanel.stats.avgRating")}</span>
								</div>
								<div className="flex-1 flex flex-col items-center gap-1">
									<span className="font-display font-bold text-lg text-white">{stats.totalPlaylists}</span>
									<span className="text-[0.8rem] tracking-widest uppercase text-white/70">{t("profilePanel.stats.playlists")}</span>
								</div>
							</div>

							<div className="flex justify-between border border-white/40 rounded-xl px-2 py-3 bg-white/[0.02]">
								<div className="flex-1 flex flex-col items-center gap-1">
									<span className="font-display font-bold text-sm text-white">{stats.totalCollected}</span>
									<span className="text-[0.8rem] tracking-widest uppercase text-white/70">{t("profilePanel.stats.collection")}</span>
								</div>
								<div className="flex-1 flex flex-col items-center gap-1 text-center">
									<span className="font-display font-bold text-sm text-white truncate max-w-full" title={stats.favoriteArtist ?? undefined}>
										{stats.favoriteArtist ?? '—'}
									</span>
									<span className="text-[0.8rem] tracking-widest uppercase text-white/70">{t("profilePanel.stats.favoriteArtist")}</span>
								</div>
							</div>
						</div>

						{user?.username && (
							<Link
							to={`/profile/${user.username}`}
							onClick={onClose}
							className="mt-4 text-center text-base text-orange hover:underline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
							>
								{t("profilePanel.viewFullProfile")}
							</Link>
						)}
					</div>
					) : (
						<form onSubmit={handleSubmit} className="flex flex-col gap-5">
							<label className="flex flex-col gap-1.5 text-sm tracking-widest text-white/70">
								{t("profilePanel.form.displayNameLabel")}
								<input
									type="text"
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
									maxLength={20}
									className="bg-brown-dark border border-white/40 rounded-lg px-2.5 py-2 text-white font-body text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
								/>
							</label>

							<label className="flex flex-col gap-1.5 text-sm tracking-widest text-white/70">
								{t("profilePanel.form.bioLabel")}
								<textarea
									value={bio}
									onChange={(e) => setBio(e.target.value)}
									maxLength={110}
									className="bg-brown-dark border border-white/40 rounded-lg px-2.5 py-2 text-white font-body text-sm resize-none min-h-[70px] leading-relaxed focus:outline-none focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
								/>
								<span className="block text-right text-[0.65rem] text-white/70">{bio.length}/110</span>
							</label>

							{error && <p className="text-orange text-sm mt-0.5" role="alert">{error}</p>}

							<div className="flex gap-3">
								<button
									type="submit"
									disabled={saving}
									className="flex-1 bg-orange border-none rounded-full py-2.5 text-black font-body font-semibold cursor-pointer transition hover:bg-midnight-violet hover:text-white disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
								>
									{saving ? t("profilePanel.form.saving") : t("profilePanel.form.save")}
								</button>
							</div>
						</form>
					)}
				</div>

				{mode === "view" && (
					<button
						className="flex shrink-0 items-center justify-center gap-2 mt-8 w-full py-2 bg-transparent border border-brown-dark/50 rounded-full text-white/90 font-body font-normal text-xs tracking-[0.18em] uppercase cursor-pointer transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
						onClick={handleLogout}
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
							<polyline points="16 17 21 12 16 7" />
							<line x1="21" y1="12" x2="9" y2="12" />
						</svg>
						{t("profilePanel.signOut")}
					</button>
				)}
			</div>
		</div>
	);
}
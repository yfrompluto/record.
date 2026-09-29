// =============================================================
//		This Navbar includes the album searching feature, as
//			well as an easy access to the site's features (such as
//			the personal collection, playlists or social features)
// =============================================================

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import api from "../../services/api";
import NotificationBell from "./NotificationBell";
import { useTranslation } from "react-i18next";
import ExplorerIcon from "../../assets/icons/explore.svg?react";
import ChatIcon from "../../assets/icons/chat.svg?react";
import FriendIcon from "../../assets/icons/friends.svg?react";
import BlindtestIcon from "../../assets/icons/blindtest.svg?react";
import CollectionIcon from "../../assets/icons/collection.svg?react";

function MenuLink({ to, label, badge, onNavigate, icon: Icon, innerRef }) {
	return (
		<Link
			ref={innerRef}
			to={to}
			onClick={onNavigate}
			role="menuitem"
			aria-label={badge ? `${label} (${badge})` : label}
			className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/85 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
			>
			<Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
			<span className="text-sm font-body">{label}</span>
			{badge > 0 && (
				<span
					aria-hidden="true"
					className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-orange text-black text-[10px] font-bold leading-[18px] text-center"
				>
					{badge > 9 ? "9+" : badge}
				</span>
			)}
		</Link>
	)
}

function NavDropdown({ user, friendRequestCount, unreadMessageCount, onClose, triggerRef }) {
	const { t } = useTranslation();
	const panelRef = useRef(null);
	const firstLinkRef = useRef(null);

	useEffect(() => {
		firstLinkRef.current?.focus();

		function handleKeyDown(e) {
			if (e.key === "Escape") {
				onClose();
				return;
			}
			if (e.key !== "Tab" || !panelRef.current) return;
			const focusable = panelRef.current.querySelectorAll('a[href], button:not([disabled])');
			if (focusable.length === 0) return;
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

		function handleClickOutside(e) {
			if (
				panelRef.current &&
				!panelRef.current.contains(e.target) &&
				triggerRef.current &&
				!triggerRef.current.contains(e.target)
			) {
				onClose();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handleClickOutside);
			triggerRef?.current?.focus();
		};
	}, [onClose, triggerRef]);

	return (
		<div
			ref={panelRef}
			role="menu"
			aria-label={t('navbar.menu', 'Main menu')}
			className="absolute left-0 top-full mt-2 w-64 bg-brown-dark border border-white/10 rounded-lg shadow-xl p-2 z-50 flex flex-col gap-0.5"
		>
			<MenuLink
				innerRef={firstLinkRef}
				to="/explore"
				label={t('navbar.links.explore')}
				icon={ExplorerIcon}
				onNavigate={onClose}
			/>
			<MenuLink
				to={`/${user?.username}/collection`}
				label={t('navbar.links.collection')}
				icon={CollectionIcon}
				onNavigate={onClose}
			/>
			<MenuLink
				to="/friends"
				label={t('navbar.links.friends')}
				icon={FriendIcon}
				badge={friendRequestCount}
				onNavigate={onClose}
			/>
			<MenuLink
				to="/chat"
				label={t('navbar.links.chat')}
				icon={ChatIcon}
				badge={unreadMessageCount}
				onNavigate={onClose}
			/>
			<MenuLink
				to="/blindtest"
				label={t('navbar.links.blindTest')}
				icon={BlindtestIcon}
				onNavigate={onClose}
			/>
		</div>
	)
}

export default function Navbar({ onAvatarClick }) {
	const { t } = useTranslation();
	const { user } = useAuth();
	const { notifications } = useNotifications();
	const navigate = useNavigate();
	const [searchValue, setSearchValue] = useState("");
	const [results, setResults] = useState([]);
	const [history, setHistory] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const containerRef = useRef(null);
	const menuButtonRef = useRef(null);

	const friendRequestCount = notifications.filter(
		(n) => !n.isRead && n.type === "FRIEND_REQUEST"
	).length;
	const unreadMessageCount = notifications.filter(
		(n) => !n.isRead && n.type === "NEW_MESSAGE"
	).length;

	function formatArtists(credits) {
		if (!credits || credits.length === 0)
			return t('common.unknownArtist');
		return credits.map((c) => `${c.name}${c.joinphrase ?? ""}`).join("");
	}

	function getHistoryKey() {
		return user?.id ? `searchHistory:${user.id}` : null;
	}

	function loadHistory() {
		const key = getHistoryKey();
		if (!key)
			return [];
		try {
			return JSON.parse(localStorage.getItem(key)) || [];
		} catch {
			return [];
		}
	}

	function saveToHistory(album) {
		const key = getHistoryKey();
		if (!key)
			return;
		const current = loadHistory();
		const filtered = current.filter((a) => a.id !== album.id);
		filtered.unshift({
			id: album.id,
			title: album.title,
			artists: formatArtists(album["artist-credit"]),
			coverArtUrl: album.coverArtUrl ?? null,
		});
		const trimmed = filtered.slice(0, 10);
		localStorage.setItem(key, JSON.stringify(trimmed));
		setHistory(trimmed);
	}

	function saveHistoryItemToTop(item) {
		const key = getHistoryKey();
		if (!key)
			return;
		const current = loadHistory();
		const filtered = current.filter((a) => a.id !== item.id);
		filtered.unshift(item);
		const trimmed = filtered.slice(0, 10);
		localStorage.setItem(key, JSON.stringify(trimmed));
		setHistory(trimmed);
	}

	function clearHistory() {
		const key = getHistoryKey();
		if (!key)
			return;

		localStorage.removeItem(key);
		setHistory([]);
	}

	useEffect(() => {
		setHistory(loadHistory());
	}, [user?.id]);

	useEffect(() => {
		const query = searchValue.trim();
		if (!query) {
			setResults([]);
			setLoading(false);
			setError(null);
			setActiveIndex(-1);
			return;
		}

		setLoading(true);
		setError(null);
		setActiveIndex(-1);

		const timeoutId = setTimeout(() => {
			api
				.searchAlbums(query)
				.then((data) => {
					setResults(data["release-groups"] ?? []);
					setActiveIndex(-1);
				})
				.catch((err) => {
					if (err.status === 503) {
						setError(t('navbar.searchError', "The search failed, try again."));
					} else {
						setError(t('navbar.noResults'));
					}
					setResults([]);
					setActiveIndex(-1);
				})
				.finally(() => setLoading(false));
		}, 700);
		return () => clearTimeout(timeoutId);
	}, [searchValue, t]);

	useEffect(() => {
		function handleClickOutside(e) {
			if (containerRef.current && !containerRef.current.contains(e.target)) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside)
	}, []);

	useEffect(() => {
	if (activeIndex < 0) return;
		document.getElementById(`navbar-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
	}, [activeIndex])

	function selectAlbum(album) {
		saveToHistory(album);
		navigate(`/albums/${album.id}`);
		setSearchValue("");
		setResults([]),
		setIsOpen(false);
		setActiveIndex(-1);
	}
	function selectHistoryItem(item) {
		saveHistoryItemToTop(item);
		navigate(`/albums/${item.id}`);
		setSearchValue("");
		setResults([]);
		setIsOpen(false);
		setActiveIndex(-1);
	}
	function handleSearchKeyDown(e) {
		if (e.key === "Escape") {
			setIsOpen(false);
			return;
		}
		const query = searchValue.trim();
		const activeList = query.length > 0 ? results : history;
		if (activeList.length === 0)
			return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIndex((prev) => (prev + 1) % activeList.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIndex((prev) => (prev <= 0 ? activeList.length - 1 : prev - 1));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const chosen = activeIndex >= 0 ? activeList[activeIndex] : activeList[0];
			if (query.length > 0) {
				selectAlbum(chosen);
			} else {
				selectHistoryItem(chosen);
			}
		}
	}
	function handleSearchFocus() {
		setIsOpen(true);
		if (searchValue.trim().length === 0) {
			setHistory(loadHistory());
		}
	}
	const avatarSrc = user?.avatarFilename
		? `/avatars/${user.avatarFilename}`
		: "/def_avatar.svg";
	
const trimmedQuery = searchValue.trim();
const showingHistory = trimmedQuery.length === 0 && history.length > 0;
const showDropdown = isOpen && (trimmedQuery.length > 0 || showingHistory);

const activeList = trimmedQuery.length > 0 ? results : history;
const optionsRendered = showDropdown && !loading && !error && activeList.length > 0;
const activeOptionId =
    optionsRendered && activeIndex >= 0 && activeIndex < activeList.length
        ? `navbar-option-${activeIndex}`
        : undefined;

	const notifBagdeTotal = friendRequestCount + unreadMessageCount;

	return (
		<nav
			role="navigation"
			aria-label={t('navbar.mainNav', 'Main navigation')}
			className="relative font-body bg-black text-white flex items-center gap-4 px-4 py-3"
		>
			<div className="relative flex items-center gap-3">
				<button
					ref={menuButtonRef}
					onClick={() => setIsMenuOpen((v) => !v)}
					aria-haspopup="true"
					aria-expanded={isMenuOpen}
					aria-label={t('navbar.openMenu', 'Open menu')}
					className="relative p-1.5 rounded hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
						<line x1="3" y1="6" x2="21" y2="6" />
						<line x1="3" y1="12" x2="21" y2="12" />
						<line x1="3" y1="18" x2="21" y2="18" />
					</svg>
					{notifBagdeTotal > 0 && (
						<span
							aria-hidden="true"
							className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-orange text-black text-[10px] font-bold leading-4 text-center"
						>
							{notifBagdeTotal > 9 ? "9+" : notifBagdeTotal}
						</span>
					)}
				</button>

				{isMenuOpen && (
					<NavDropdown
						user={user}
						friendRequestCount={friendRequestCount}
						unreadMessageCount={unreadMessageCount}
						onClose={() => setIsMenuOpen(false)}
						triggerRef={menuButtonRef}
					/>
				)}

				<div className="relative w-32 sm:w-56 md:w-72 lg:w-96" ref={containerRef}>
					<label htmlFor="navbar-search" className="sr-only">
						{t('navbar.searchLabel')}
					</label>
					<input
						id="navbar-search"
						type="text"
						placeholder={t('navbar.searchPlaceholder')}
						value={searchValue}
						onChange={(e) => {
							setSearchValue(e.target.value);
							setIsOpen(true);
						}}
						onFocus={handleSearchFocus}
						onKeyDown={handleSearchKeyDown}
						role="combobox"
						aria-expanded={showDropdown}
						aria-controls="navbar-search-results"
						aria-autocomplete="list"
						aria-activedescendant={activeOptionId}
						autoComplete="off"
						className="font-body w-full bg-black/40 text-white placeholder-white/50 rounded px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
					/>
					{showDropdown && (
						<div className="absolute left-0 top-full mt-1 w-full bg-brown-dark border border-white/10 rounded shadow-lg z-50 max-h-80 overflow-y-auto">
							{showingHistory && (
								<div className="flex items-center justify-between px-3 py-1.5">
									<span className="text-white/70 text-xs uppercase tracking-wide">
										{t('navbar.recentSearches', 'Recent searches')}
									</span>
									<button
										type="button"
										onClick={clearHistory}
										className="text-xs text-white/60 hover:text-white"
									>
										{t('navbar.clearHistory', 'Clear history')}
									</button>
								</div>
							)}

							<ul
								id="navbar-search-results"
								role="listbox"
								aria-label={showingHistory ? t('navbar.recentSearches', 'Recent searches') : t('navbar.searchResults', 'Search results')}
							>
								{!showingHistory && loading && (
									<li className="px-3 py-2 text-white/50 text-sm" role="status">
										{t('navbar.searching')}
									</li>
								)}
								{!showingHistory && !loading && error && (
									<li className="px-3 py-2 text-white/50 text-sm" role="alert">
										{error}
									</li>
								)}

								{showingHistory && 
									history.map((item, index) => (
										<li
											key={item.id}
											id={`navbar-option-${index}`}
											role="option"
											aria-selected={index === activeIndex}
											tabIndex={-1}
										>
											<button
												type="button"
												onClick={() => selectHistoryItem(item)}
												onMouseEnter={() => setActiveIndex(index)}
												className={`w-full text-left px-3 py-2 text-sm cursor-pointer ${
													index === activeIndex ? "bg-white/10" : ""
												} hover:bg-white/10`}
										>
												<div className="font-semibold truncate">{item.title}</div>
												<div className="text-white/50 text-xs truncate">{item.artists}</div>
											</button>
											</li>
										))}
					
								{!showingHistory && 
									!loading &&
									!error &&
									results.map((album, index) => (
										<li
											key={album.id}
											id={`navbar-option-${index}`}
											role="option"
											aria-selected={index === activeIndex}
											tabIndex={-1}
										>
											<button
												type="button"
												onClick={() => selectAlbum(album)}
												onMouseEnter={() => setActiveIndex(index)}
												className={`w-full text-left px-3 py-2 text-sm cursor-pointer ${
													index === activeIndex ? "bg-white/10" : ""
												} hover:bg-white/10`}
										>
												<div className="font-semibold truncate">{album.title}</div>
												<div className="text-white/50 text-xs truncate">{formatArtists(album["artist-credit"])}</div>
											</button>
										</li>
									))}
							</ul>
						</div>
					)}
				</div>
			</div>

			<Link
				to="/home"
				className="absolute left-1/2 -translate-x-1/2 font-display text-orange text-2xl leading-none focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
			>
				{t('navbar.brand')}
			</Link>

			<div className="ml-auto flex items-center gap-3">
				<NotificationBell />
				<button
					onClick={onAvatarClick}
					aria-label={t('navbar.openProfilePanel')}
					className="rounded-full focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
				>
					<img src={avatarSrc} alt="" className="w-8 h-8 rounded-full object-cover" />
				</button>
			</div>
		</nav>
	);
}
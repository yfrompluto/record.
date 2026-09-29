// =============================================================
//    Collection page — private, shows the current user's saved
//    	albums and allows them to keep 3 as their favourites, 
//			which will show up on their profile pannel
// =============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from "react-i18next";
import api from '../../services/api';

const PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 400;
const BACK_TO_TOP_FLAG = 400;
const DEFAULT_COVER = "/icons/def_cover_text.svg"

interface ArtistCredit {
	artist: {
		name: string;
	};
}

interface AlbumSummary {
	mbid: string;
	title: string;
	coverArtUrl: string | null;
	releaseYear: number | null;
	artists: ArtistCredit[];
}

interface CollectionEntry {
	id: number;
	createdAt: string;
	isFavorite: boolean;
	album: AlbumSummary;
}

interface CollectionResponse {
	items: CollectionEntry[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

function artistNames(album: AlbumSummary, unknownLabel: string): string {
 	return album.artists.map((credit) => credit.artist.name).join(', ') || unknownLabel;
}

export default function Collection() {
	const navigate = useNavigate();
	const { username } = useParams();
	const { user } = useAuth();
	const { t } = useTranslation();

	const [entries, setEntries] = useState<CollectionEntry[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [searchInput, setSearchInput] = useState('');
	const [search, setSearch] = useState('');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [favoriteError, setFavoriteError] = useState<string | null>(null);
	const [showBackToTop, setShowBackToTop] = useState(false);

	const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// private page - only connected user (owner) can see
	useEffect(() => {
		if (!user || user.username !== username) {
			navigate('/home');
		}
	}, [user, username, navigate]);

	// debounce search
	useEffect(() => {
		if (searchDebounceRef.current)
			clearTimeout(searchDebounceRef.current);
		searchDebounceRef.current = setTimeout(() => {
			setSearch(searchInput.trim());
			setPage(1);
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			if (searchDebounceRef.current)
				clearTimeout(searchDebounceRef.current);
		};
	}, [searchInput]);

	// load the user's collection
	const loadCollection = useCallback(async () => {
		if (!user || user.username !== username) return;

		setLoading(true);
		setError(null);
		try {
			const data: CollectionResponse = await api.getCollection(page, PAGE_SIZE, search);
			setEntries(data.items);
			setTotalPages(data.totalPages);
		} catch (err) {
			setError(t('collection.errors.loadFailed'));
		} finally {
			setLoading(false);
		}
	}, [page, search, user, username, t]);

	useEffect(() => {
		loadCollection();
	}, [loadCollection]);

	// back to top button appears only when user reaches the bottom
	useEffect(() => {
		function handleScroll() {
			setShowBackToTop(window.scrollY > BACK_TO_TOP_FLAG);
		}
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	async function handleToggleFavorite(mbid: string) {
		setFavoriteError(null);
		try {
			const result = await api.toggleFavorite(mbid);

			if (!result.success) {
				if (result.reason === 'MAX_FAVORITES') {
					setFavoriteError(t('collection.errors.maxFavorites'));
				} else {
					setFavoriteError(t('collection.errors.favoriteUpdateFailed'));
				}
				return;
			}

			setEntries((prev) =>
				prev.map((entry) =>
					entry.album.mbid === mbid ? { ...entry, isFavorite: result.entry.isFavorite } : entry,
				),
			);
		} catch (err: any) {
			setFavoriteError(t('collection.errors.favoriteUpdateFailed'));
		}
	}

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	// keeps collection private
	if (!user || user.username !== username) {
		return null;
	}

	return (
		<div className="max-w-5xl mx-auto px-6 py-10">
			<h1 className="font-display text-3xl text-white mb-6">{t('collection.title')}</h1>

			<div className="mb-8">
			<label htmlFor="collection-search" className="sr-only">
				{t('collection.searchLabel')}
			</label>
			<input
				id="collection-search"
				type="search"
				placeholder={t('collection.searchPlaceholder')}
				value={searchInput}
				onChange={(e) => setSearchInput(e.target.value)}
				className="w-full max-w-md bg-transparent border border-white/40 rounded px-4 py-2 text-white placeholder:text-white/60 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
			/>
			</div>

			{favoriteError && (
			<p role="alert" className="text-orange/80 text-sm mb-4">
				{favoriteError}
			</p>
			)}

			{error && (
			<p role="alert" className="text-orange/80 text-sm mb-4">
				{error}
			</p>
			)}

			{loading ? (
			<p className="text-white/60">{t('collection.loading')}</p>
			) : entries.length === 0 ? (
			<p className="text-white/60">
				{search ? t('collection.emptySearch') : t('collection.emptyDefault')}
			</p>
			) : (
			<ul className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-8">
				{entries.map((entry) => (
					<li key={entry.id}>
					<AlbumCard
						entry={entry}
						onOpen={() => navigate(`/albums/${entry.album.mbid}`)}
						onToggleFavorite={() => handleToggleFavorite(entry.album.mbid)}
						t={t}
					/>
					</li>
				))}
			</ul>
			)}

			{totalPages > 1 && (
			<nav aria-label={t('collection.pagination.ariaLabel')} className="flex justify-center gap-2 mt-10">
				{Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
					<button
					key={pageNumber}
					onClick={() => setPage(pageNumber)}
					aria-current={pageNumber === page ? 'page' : undefined}
					className={`px-3 py-1 rounded border focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 ${
						pageNumber === page ? 'border-orange text-white' : 'border-white/40 text-white/60'
					}`}
					>
					{pageNumber}
					</button>
				))}
			</nav>
			)}

			{showBackToTop && (
			<button
				onClick={scrollToTop}
				aria-label={t('collection.backToTop')}
				className="fixed bottom-6 right-6 bg-mauve text-white rounded-full p-3 shadow-lg focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
			>
				<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</button>
			)}
		</div>
	);
	}

	interface AlbumCardProps {
		entry: CollectionEntry;
		onOpen: () => void;
		onToggleFavorite: () => void;
		t: (key: string, options?: Record<string, unknown>) => string;
	}

	function AlbumCard({ entry, onOpen, onToggleFavorite, t }: AlbumCardProps) {
	const { album, isFavorite } = entry;

	return (
		<div className="flex flex-col items-start">
			<div className="relative w-full">

			<button
				onClick={onOpen}
				className="block w-full aspect-square overflow-hidden rounded focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
			>
				<img
					src={album.coverArtUrl || DEFAULT_COVER}
					alt={t('collection.coverAlt', { title: album.title })}
					className="w-full h-full object-cover"
				/>
			</button>

			<button
				onClick={onToggleFavorite}
				aria-label={
					isFavorite
					? t('collection.favorite.remove', { title: album.title })
					: t('collection.favorite.add', { title: album.title })
				}
				aria-pressed={isFavorite}
				className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
			>
				<svg
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill={isFavorite ? 'currentColor' : 'none'}
					stroke="currentColor"
					strokeWidth="2"
					className={isFavorite ? 'text-orange' : 'text-white'}
				>
					<path
					d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
					strokeLinecap="round"
					strokeLinejoin="round"
					/>
				</svg>
			</button>
			</div>

			<button
			onClick={onOpen}
			className="mt-2 text-left w-full focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
			>
			<p className="font-body text-white text-sm truncate">{album.title}</p>
			<p className="font-body text-white/60 text-xs truncate">{artistNames(album, t('common.unknownArtist'))}</p>
			</button>
		</div>
	);
}
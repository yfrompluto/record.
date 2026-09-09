// ===================================================================
//		Helper — handles the Album for AlbumContent page
// ===================================================================

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../services/api";
import AlbumPageContent, { AlbumDetail } from "../../components/music/AlbumPageContent";

export default function AlbumPage() {
	const { t } = useTranslation();
	const { mbid } = useParams<{ mbid: string }>();
	const navigate = useNavigate();

	const [album, setAlbum] = useState<AlbumDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!mbid)
			return;

		let cancelled = false;
		setLoading(true);
		setError(null);
		setAlbum(null);

		api
			.getAlbumDetail(mbid)
			.then((data: AlbumDetail) => {
				if (!cancelled)
					setAlbum(data);
			})
			.catch((err) => {
				if (cancelled)
					return;
				setError(
					err?.status === 404
						? t("recpage.notFound", "This album couldn't be found.")
						: t("recpage.loadError", "Momentarily couldn't load this album. Try again in an instant.")
				);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [mbid, t]);

	function close() {
		navigate(-1);
	}

	useEffect(() => {
		if (loading || !(error || !album))
			return;

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				e.preventDefault();
				close();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [loading, error, album]);

	if (loading) {
		return (
			<div
				role="status"
				aria-live="polite"
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
			>
				<div
					className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#E15A34]"
					aria-hidden="true"
				>
				</div>
				<span className="sr-only">{t("recpage.loadingAlbum", "Loading album...")}</span>
			</div>
		);
	}

	if (error || !album) {
		return (
			<div
				role="dialog"
				aria-modal="true"
				aria-label={t("recpage.notFound", "This album couldn't be found.") as string}
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
				onMouseDown={(e) => {
					if (e.target === e.currentTarget)
						close();
				}}
			>
				<div className="relative flex flex-col items-center gap-3 px-4">
					<button
						onClick={close}
						aria-label="Close"
						autoFocus
						className="absolute -top-8 right-0 text-white/60 hover:text-olive focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
					>
						✕
					</button>
					<p className="text-orange" role="alert">
						{error ?? t("recpage.notFound", "This album couldn't be found.")}
					</p>
				</div>
			</div>
		);
	}

	return <AlbumPageContent album={album} onClose={close} />;
}
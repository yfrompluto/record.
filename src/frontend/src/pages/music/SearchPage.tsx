// // =============================================================
// //		Search Page configuraiton
// // =============================================================


// import { useEffect, useState } from "react";
// import { useSearchParams, useNavigate } from "react-router-dom";
// import api from "../../services/api";

// interface ArtistCredit {
// 	name: string;
// 	joinphrase: string;
// }

// interface ReleaseGroupResult {
// 	id: string;
// 	title: string;
// 	"artist-credit"?: ArtistCredit[];
// }

// interface SearchResponse {
// 	"release-groups": ReleaseGroupResult[];
// }

// function formatArtists(credits?: ArtistCredit[]): string {
// 	if (!credits || credits.length === 0) return "Unknown artist";
// 		return credits.map((c) => `${c.name}${c.joinphrase ?? ""}`).join("");
// }

// export default function SearchPage() {
// 	const [searchParams] = useSearchParams();
// 	const navigate = useNavigate();
// 	const query = searchParams.get("q")?.trim() ?? "";

// 	const [results, setResults] = useState<ReleaseGroupResult[]>([]);
// 	const [loading, setLoading] = useState(false);
// 	const [error, setError] = useState<string | null>(null);

// 	useEffect(() => {
// 		if (!query) {
// 			setResults([]);
// 			setError(null);
// 			return;
// 		}

// 		let cancelled = false;
// 		setLoading(true);
// 		setError(null);

// 		api
// 			.searchAlbums(query)
// 			.then((data: SearchResponse) => {
// 			if (cancelled) return;
// 				setResults(data["release-groups"] ?? []);
// 			})
// 			.catch(() => {
// 			if (cancelled) return;
// 				setError("Couldn't reach the catalog. Try again in a moment.");
// 			})
// 			.finally(() => {
// 			if (cancelled) return;
// 				setLoading(false);
// 			});

// 		return () => {
// 			cancelled = true;
// 		};
// 	}, [query]);

// 	return (
// 		<main className="font-body text-white px-6 py-8 max-w-5xl mx-auto">
// 			<h1 className="font-display text-orange text-3xl mb-1">
// 			{query ? `Results for "${query}"` : "Search"}
// 			</h1>

// 			{!query && (
// 			<p className="text-white/60 mt-4">
// 				Type an album, title, or artist in the bar above to start digging.
// 			</p>
// 			)}

// 			{loading && (
// 			<p className="text-white/60 mt-6" role="status">
// 				Searching…
// 			</p>
// 			)}

// 			{error && (
// 			<p className="text-orange mt-6" role="alert">
// 				{error}
// 			</p>
// 			)}

// 			{!loading && !error && query && results.length === 0 && (
// 			<p className="text-white/60 mt-6">
// 				No albums found for "{query}". Try a different spelling or artist name.
// 			</p>
// 			)}

// 			{!loading && !error && results.length > 0 && (
// 			<ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
// 				{results.map((album) => (
// 					<li key={album.id}>
// 					<button
// 						onClick={() => navigate(`/albums/${album.id}`)}
// 						className="w-full text-left bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-colors focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
// 					>
// 						<div className="aspect-square w-full rounded bg-mauve/30 flex items-center justify-center mb-3">
// 							<span className="text-white/40 text-xs">No cover yet</span>
// 						</div>
// 						<p className="font-body font-semibold text-sm leading-snug truncate">
// 							{album.title}
// 						</p>
// 						<p className="text-white/60 text-xs truncate">
// 							{formatArtists(album["artist-credit"])}
// 						</p>
// 					</button>
// 					</li>
// 				))}
// 			</ul>
// 			)}
// 		</main>
// 	);
// }
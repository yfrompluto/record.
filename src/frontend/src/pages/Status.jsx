// ==================================================================
//          Displays the real-time health status of the application's
//          critical components (currently: PostgreSQL database).
//          Polls the /api/health endpoint at a fixed interval.
// ==================================================================

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../services/api";

const POLL_INTERVAL_MS = 15000; // 15 seconds
const HIDDEN_INDICATORS = ["memory_heap", "memory_rss"];

export default function Status() {
	const { t } = useTranslation();
	const [health, setHealth] = useState(null);
	const [error, setError] = useState(null);
	const [lastChecked, setLastChecked] = useState(null);

	async function fetchHealth() {
	try {
		const data = await api.health();
		setHealth(data);
		setError(null);
		} catch (err) {
			setError(err);
			setHealth(null);
		} finally {
			setLastChecked(new Date());
		}
	}

	useEffect(() => {
		fetchHealth();
		const interval = setInterval(fetchHealth, POLL_INTERVAL_MS);
		return () => clearInterval(interval);
	}, []);

	const isUp = health?.status === "ok";

	return (
		<div className="max-w-xl mx-auto px-6 py-12 font-body text-white bg-gradient-to-t from-midnight-violet via-brown-dark to-black min-h-screen">
		{/* <div tabIndex={0} className="max-w-xl mx-auto px-6 py-12 font-body text-white bg-gradient-to-t from-midnight-violet via-brown-dark to-black min-h-screen focus:outline-none focus-visible:outline-2 focus-visible:outline-orange focus-visible:-outline-offset-2"> */}
			<h1 className="font-display text-3xl mb-6">{t('status.title')}</h1>

      	<div className={`px-6 py-4 rounded-lg font-semibold mb-6 text-center border ${
      		isUp
      			? "bg-[#3FB27F]/15 text-[#3FB27F] border-[#3FB27F]"
      			: "bg-orange/15 text-orange border-orange"
      	}`}
      	>
      		{isUp ? t('status.allOperational') : t('status.disruption')}
      	</div>

		{health && (
			<ul className="list-none p-0 m-0 mb-6 border border-mauve/20 rounded-lg overflow-hidden">
				{Object.entries(health.details)
				.filter(([name]) => !HIDDEN_INDICATORS.includes(name))
				.map(([name, detail]) => (
					<li
						key={name}
						className="flex items-center gap-3 px-5 py-3.5 bg-brown-dark border-b border-mauve/20 last:border-b-0 text-sm"
					>
					<span
						className={`w-2 h-2 rounded-full ${
							detail.status === "up"
								? "bg-[#3FB27F]"
								: detail.status === "down"
								? "bg-orange"
								: "bg-white/40"
							}`}
						/>
						{name} — {t(`status.componentStatus.${detail.status}`, { defaultValue: detail.status })}
					</li>
				))}
			</ul>
		)}


		{error && (
			<p className="text-orange text-sm">
				{t('status.error', { code: error.status ?? t('status.networkError') })}
			</p>
		)}

		{lastChecked && (
			<p className="text-white/50 text-xs mt-4">
				{t('status.lastChecked', { time: lastChecked.toLocaleTimeString() })}
			</p>
		)}
		</div>
	);
}

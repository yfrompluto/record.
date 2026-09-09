// ========================================================================
//    SideMenu: left overlay panel with primary site navigation
//    (Explore, Friends, Blind Test). Opened via the hamburger button
//    in the Navbar. Same modal overlay pattern as ProfilePanel:
//    role="dialog", closes on Escape or outside click, focus enters
//    the panel on open and returns to the trigger button on close.
// ========================================================================

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../context/NotificationContext";

export default function SideMenu({ onClose, triggerRef }) {
	const { t } = useTranslation();
	const { notifications } = useNotifications();
	const panelRef = useRef(null);
	const firstLinkRef = useRef(null);

	const friendRequestCount = notifications.filter(
		(n) => !n.isRead && n.type === "FRIEND_REQUEST"
	).length;

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

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			triggerRef?.current?.focus();
		};
	}, [onClose, triggerRef]);

	function handleOverlayClick(e) {
		if (e.target === e.currentTarget) onClose();
	}

	return (
		<div className="fixed inset-0 bg-black/50 z-[90]" onClick={handleOverlayClick}>
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-label={t('navbar.menu', 'Main menu')}
				className="fixed top-0 left-0 h-screen w-72 bg-gradient-to-t from-olive via-brown-dark to-black text-white p-6 shadow-[4px_0_20px_rgba(0,0,0,0.4)] flex flex-col gap-1"
			>
				<button
					onClick={onClose}
					aria-label={t('common.close', 'Close menu')}
					className="self-end mb-4 text-2xl leading-none focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
				>
					✕
				</button>

				<nav aria-label={t('navbar.menu', 'Main menu')}>
					<ul className="flex flex-col gap-2 text-sm">
						<li>
							<Link
								ref={firstLinkRef}
								to="/explore"
								onClick={onClose}
								className="block px-2 py-2 rounded hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
							>
								{t('navbar.links.explore')}
							</Link>
						</li>
						<li>
							<Link
								to="/friends"
								onClick={onClose}
								aria-label={
									friendRequestCount > 0
										? `${t('navbar.links.friends')} (${friendRequestCount} new requests)`
										: t('navbar.links.friends')
								}
								className="flex items-center gap-2 px-2 py-2 rounded hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
							>
								{t('navbar.links.friends')}
								{friendRequestCount > 0 && (
									<span
										aria-hidden="true"
										className="min-w-[16px] h-4 px-1 rounded-full bg-orange text-black text-[10px] font-bold leading-4 text-center"
									>
										{friendRequestCount > 9 ? "9+" : friendRequestCount}
									</span>
								)}
							</Link>
						</li>
						<li>
							<Link
								to="/blindtest"
								onClick={onClose}
								className="block px-2 py-2 rounded hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
							>
								{t('navbar.links.blindTest')}
							</Link>
						</li>
					</ul>
				</nav>
			</div>
		</div>
	);
}

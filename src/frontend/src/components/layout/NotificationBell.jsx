import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import NotifIcon from "../../assets/icons/notif.svg?react";

function describeNotification(n, t) {
	const name = n.actor?.displayName || n.actor?.username || t("notifications.someone");
	switch (n.type) {
		case "FRIEND_REQUEST":
			return t("notifications.types.friendRequest", { name });
		case "FRIEND_REQUEST_ACCEPTED":
			return t("notifications.types.friendRequestAccepted", { name });
		case "NEW_MESSAGE":
			return t("notifications.types.newMessage", { name });
		case "FRIEND_ALBUM_RATED":
			return t("notifications.types.friendAlbumRated", { name });
		case "RATING_LIKED":
			return n.payload?.albumTitle
				? t("notifications.types.ratingLikedWithTitle", { name, title: n.payload.albumTitle })
				: t("notifications.types.ratingLiked", { name });
		case "RATING_DELETED":
			return n.payload?.albumTitle
				? t("notifications.types.ratingDeletedWithTitle", { name, title: n.payload.albumTitle })
				: t("notifications.types.ratingDeleted", { name });
	default:
		return t("notifications.types.default");
	}
}

export default function NotificationBell() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef(null);
	const navigate = useNavigate();

	useEffect(() => {
		function handleClickOutside(e) {
			if (containerRef.current && !containerRef.current.contains(e.target)) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	function handleKeyDown(e) {
		if (e.key === "Escape") setIsOpen(false);
	}

	function handleNotificationClick(n) {
		markAsRead(n.id);
		setIsOpen(false);

		switch (n.type) {
			case "FRIEND_REQUEST":
				navigate("/friends?tab=requests");
				break;
			case "FRIEND_REQUEST_ACCEPTED":
				navigate("/friends");
				break;
			case "NEW_MESSAGE":
				navigate(n.actor?.username ? `/chat/${n.actor.username}` : "/chat");
				break;
			case "FRIEND_ALBUM_RATED":
			case "RATING_LIKED":
				if (n.payload?.albumMbid) navigate(`/albums/${n.payload.albumMbid}`);
				break;
			default:
				break;
		}
	}

	if (!user) return null;

	return (
		<div className="relative" ref={containerRef}>
			<button
				onClick={() => setIsOpen((o) => !o)}
				onKeyDown={handleKeyDown}
				aria-haspopup="true"
				aria-expanded={isOpen}
				aria-label={
					unreadCount > 0
						? t("notifications.ariaLabel", { count: unreadCount })
						: t("notifications.ariaLabelNoUnread")
				}
				className="relative rounded-full p-1.5 hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
			>
				<NotifIcon className="w-8 h-8" aria-hidden="true" />
				{unreadCount > 0 && (
					<span
						aria-hidden="true"
						className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-orange text-black text-[10px] font-bold leading-4 text-center"
					>
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				)}
			</button>

			<span aria-live="polite" className="sr-only">
				{unreadCount > 0
					? t("notifications.unreadAnnounce", { count: unreadCount })
					: t("notifications.noUnreadAnnounce")}
			</span>

			{isOpen && (
				<div
					role="dialog"
					aria-label={t("notifications.title")}
					className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-brown-dark border border-white/10 rounded-lg shadow-lg z-50"
				>
					<div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
						<h2 className="font-display text-white text-sm">{t("notifications.title")}</h2>
						{unreadCount > 0 && (
							<button
								onClick={markAllAsRead}
								className="text-xs text-orange hover:underline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
							>
								{t("notifications.markAllAsRead")}
							</button>
						)}
					</div>

					{notifications.length === 0 ? (
						<p className="px-4 py-6 text-center text-sm text-white/70">{t("notifications.empty")}</p>
					) : (
						<ul className="divide-y divide-white/10">
							{notifications.map((n) => (
								<li key={n.id}>
									<button
										onClick={() => handleNotificationClick(n)}
										className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 ${
											n.isRead ? "text-white/50" : "text-white"
										}`}
									>
										<div className="flex items-start gap-2">
											{!n.isRead && (
												<span className="w-1.5 h-1.5 rounded-full bg-orange mt-1.5 shrink-0" aria-hidden="true" />
											)}
											<div className="min-w-0">
												<p className="line-clamp-2">{describeNotification(n, t)}</p>
												<p className="text-[11px] text-white/60 mt-0.5">
													{new Date(n.createdAt).toLocaleString()}
												</p>
											</div>
										</div>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}

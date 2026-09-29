// ========================================================================
//          NotificationContext keeps track of the current user's
//          notifications (list + unread count), refreshed via polling.
//          Polling only runs while the user is authenticated.
//          The unread count is polled frequently (cheap query);
//          the full list is only re-fetched when the count changes
//          or when explicitly requested (e.g. dropdown opened).
// ========================================================================

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(/** @type {any} */ (null));

const POLL_INTERVAL_MS = 1000;

export function NotificationProvider({ children }) {
	const { user } = useAuth();
	const [notifications, setNotifications] = useState([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const intervalRef = useRef(null);
	const unreadCountRef = useRef(0);

	const fetchList = useCallback(async () => {
		try {
			const list = await api.getNotifications();
			setNotifications(list);
		} catch {
			// non-critical -> fail silently, retry on next trigger
		}
	}, []);

	const pollUnreadCount = useCallback(async () => {
		try {
			const count = await api.getUnreadCount();
			if (count !== unreadCountRef.current) {
				unreadCountRef.current = count;
				setUnreadCount(count);
				fetchList(); // something changed -> refresh the full list too
			}
		} catch {
			// non-critical — fail silently, retry on next poll
		}
	}, [fetchList]);

	useEffect(() => {
		if (!user) {
			setNotifications([]);
			setUnreadCount(0);
			unreadCountRef.current = 0;
			if (intervalRef.current) clearInterval(intervalRef.current);
			return;
		}

		pollUnreadCount();
		fetchList();
		intervalRef.current = setInterval(pollUnreadCount, POLL_INTERVAL_MS);
		return () => clearInterval(intervalRef.current);
	}, [user, pollUnreadCount, fetchList]);

	const markAsRead = useCallback(async (id) => {
		setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
		setUnreadCount((prev) => {
			const next = Math.max(0, prev - 1);
			unreadCountRef.current = next;
			return next;
		});
		try {
			await api.markNotificationAsRead(id);
		} catch {
			pollUnreadCount();
			fetchList();
		}
	}, [pollUnreadCount, fetchList]);

	const markAllAsRead = useCallback(async () => {
		setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
		setUnreadCount(0);
		unreadCountRef.current = 0;
		try {
			await api.markAllNotificationsAsRead();
		} catch {
			pollUnreadCount();
			fetchList();
		}
	}, [pollUnreadCount, fetchList]);

	const markAllAsReadByType = useCallback(async (types) => {
		const targets = notifications.filter((n) => !n.isRead && types.includes(n.type));
		if (targets.length === 0) return;

		setNotifications((prev) =>
			prev.map((n) => (types.includes(n.type) ? { ...n, isRead: true } : n))
		);
		setUnreadCount((prev) => {
			const next = Math.max(0, prev - targets.length);
			unreadCountRef.current = next;
			return next;
		});

		try {
			await Promise.all(targets.map((n) => api.markNotificationAsRead(n.id)));
		} catch {
			pollUnreadCount();
			fetchList();
		}
	}, [notifications, pollUnreadCount, fetchList]);

	return (
		<NotificationContext.Provider value={{ notifications, unreadCount, refresh: fetchList, markAsRead, markAllAsRead, markAllAsReadByType }}>
			{children}
		</NotificationContext.Provider>
	);
}

export function useNotifications() {
	const context = useContext(NotificationContext);
	if (!context) {
		throw new Error('useNotifications must be used within a NotificationProvider');
	}
	return context;
}


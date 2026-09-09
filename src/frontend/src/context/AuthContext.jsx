// ========================================================================
//		AuthContext allows the React App to consistently know who the user is
//		and whether they're logged in.
// ========================================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * @typedef {{
 *   user: any,
 *   loading: boolean,
 *   checkAuth: () => Promise<void>,
 *   logout: () => Promise<void>,
 * }} AuthContextValue
 */

/** @type {import('react').Context<AuthContextValue | null>} */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	const checkAuth = useCallback(async () => {
		try {
			const data = await api.me();
			setUser(data);
		} catch {
			setUser(null);
		}
	}, []);

	useEffect(() => {
		checkAuth().finally(() => setLoading(false));
	}, [checkAuth]);

	const logout = useCallback(async () => {
		try {
			await api.logout();
		} finally {
			setUser(null);
		}
	}, []);

	return (
		<AuthContext.Provider value={{ user, loading, checkAuth, logout }}>
			{children}
		</AuthContext.Provider>
	);
	}

	export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
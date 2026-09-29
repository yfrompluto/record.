// ==================================================================
//		The application's routing structure.
//		It configures public and shared routes, applies the main layout 
//		to protected pages, and handles unknown URLs.
// ==================================================================

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/layout/Layout";
import PublicLayout from "./components/layout/PublicLayout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import HomePage from "./pages/home/HomePage";
import ExplorePage from "./pages/explore/ExplorePage";
import NotFound from "./pages/NotFound";
import FriendsPage from "./pages/friends/FriendsPage";
import ProfilePage from "./pages/profile/ProfilePage";
import Status from "./pages/Status";
import ChatPage from "./pages/chat/ChatPage";
import BlindtestPage from "./pages/blindtest/BlindtestPage";
import BlindtestLobbyPage from "./pages/blindtest/BlindtestLobbyPage";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import AlbumPage from "./components/music/AlbumPage";
import Recs from "./pages/profile/Recs"
import Collection from "./pages/music/Collection"
import { NotificationProvider } from "./context/NotificationContext";

export default function App() {
	return (
		<AuthProvider>
			<NotificationProvider>
			<BrowserRouter>
			<Routes>
				{/* No navbar, footer, etc */}
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />

				{/* Public layout; anyone can access (legal pages, status, langauge switchr) */}
				<Route element={<PublicLayout />}>
					<Route path="/status" element={<Status />} />
					<Route path="/privacy-policy" element={<PrivacyPolicy />} />
					<Route path="/terms-of-service" element={<TermsOfService />} />
				</Route>

				{/* Layout & protected routes; only accessible after auth */}
				<Route element={<ProtectedRoute />}>
					<Route element={<Layout />}>
						<Route path="/" element={<HomePage />} />
						<Route path="/home" element={<HomePage />} />
						<Route path="/explore" element={<ExplorePage />} />
						<Route path="/friends" element={<FriendsPage />} />
						<Route path="/profile/:username" element={<ProfilePage />} />
						<Route path="/chat" element={<ChatPage />} />
						<Route path="/chat/:username" element={<ChatPage />} />
						<Route path="/albums/:mbid" element={<AlbumPage />} />
						<Route path="/:username/collection" element={<Collection />} />
						<Route path="/blindtest" element={<BlindtestLobbyPage />} /> 
						<Route path="/blindtest/:sessionId" element={<BlindtestPage />} />
					</Route>
				</Route>

				{/* Fall-back 404 NotFound */}
				<Route path="*" element={<NotFound />} />

			</Routes>
			</BrowserRouter>
			</NotificationProvider>
		</AuthProvider>
	);
}
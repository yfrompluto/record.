// =========================================================================
//    Main application layout component.
//    Provides the shared structure used across pages, including the navbar,
//    routed page content, & the profile panel.
// =========================================================================

import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ProfilePanel from "./ProfilePanel";

export default function Layout() {
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const { pathname } = useLocation();
	const mainRef = useRef(null);

	useEffect(() => {
		mainRef.current?.focus();
	}, [pathname]);

	return (
		<div className="app-shell flex flex-col h-screen">

			<a
			href="#main-content"
			className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-orange focus:text-black focus:px-4 focus:py-2 focus:rounded focus-visible:outline-2 focus-visible:outline-white"
			>
				Skip to content
			</a>
			<Navbar onAvatarClick={() => setIsProfileOpen(true)} />
			<main
				ref={mainRef}
				tabIndex={0}
				id="main-content"
				className="app-content flex-1 min-h-0 overflow-y-auto focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
			>
				<Outlet context={{ openProfilePanel: () => setIsProfileOpen(true) }} />
			</main>
			<Footer />
			{isProfileOpen && (
				<ProfilePanel onClose={() => setIsProfileOpen(false)} />
			)}
		</div>
	);
}
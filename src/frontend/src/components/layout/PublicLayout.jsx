// ==============================================================
//		Allows anyone to access the footer elements & legal pages
//			without auth, but without giving access or a glimpse
//			of what's inside the site 
// ==============================================================

import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import Footer from "./Footer";

export default function PublicLayout() {
	const { pathname } = useLocation();
	const mainRef = useRef(null);

	useEffect(() => {
		mainRef.current?.focus();
	}, [pathname]);

	return (
		<div className="app-shell flex flex-col h-screen">
			<main
				ref={mainRef}
				tabIndex={0}
				id="main-content"
				className="app-content flex-1 min-h-0 overflow-y-auto focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
			>
				<Outlet />
			</main>

			<Footer />
		</div>
	);
}
// ====================================================================
//		This footer includes links to Privacy Policy and Terms of Service
//			pages as well as the language switcher and help button for
//			smooth navigation across the website in fr/eng/jap.
// ====================================================================

import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Footer() {
	const { t } = useTranslation();

	return (
		<footer
			role="contentinfo"
			className="font-body bg-black border-t border-mauve/30 px-6 py-4 text-white"
		>
			<nav
				aria-label="Footer navigation"
				className="flex flex-wrap justify-center gap-4 text-xs mb-2"
			>
				<a
					href="/privacy-policy"
					className="text-white/90 hover:text-orange focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
				>
					{t("footer.privacyPolicy")}
				</a>

				<a
					href="/terms-of-service"
					className="text-white/90 hover:text-orange focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
				>
					{t("footer.termsOfService")}
				</a>

				<a
					href="/status"
					className="text-white/90 hover:text-orange focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
				>
					{t("footer.systemStatus")}
				</a>
			</nav>

			<div className="relative w-full flex items-end">
				<div className="absolute left-0 bottom-0">
					<LanguageSwitcher />
				</div>

				<p className="w-full text-center text-[11px] text-white/60">
					{t("footer.copyright", { year: new Date().getFullYear() })}
				</p>
			</div>
		</footer>
	);
}
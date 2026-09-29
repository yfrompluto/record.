// ==================================================================
//          Privacy Policy page.
//          Describes what personal data Record collects, why, how
//          it's stored, and what rights users have over their data.
// ==================================================================
import { useTranslation, Trans } from "react-i18next";

export default function PrivacyPolicy() {
	const { t } = useTranslation();

	return (
	<div className="bg-brown-dark text-white min-h-screen">
	{/* // <div tabIndex={0} className="bg-brown-dark text-white min-h-screen focus:outline-none focus-visible:outline-2 focus-visible:outline-orange focus-visible:-outline-offset-2"> */}
		<div className="max-w-3xl mx-auto px-6 py-16">
			<h1 className="font-display text-3xl mb-2">{t("privacyPolicy.title")}</h1>
			<p className="text-white/60 text-sm mb-10">{t("privacyPolicy.lastUpdated")}</p>

				<section className="mb-10">
					<h2 className="font-display text-xl mb-3">{t("privacyPolicy.sections.whoWeAre.heading")}</h2>
					<p className="text-white/80 text-sm leading-relaxed">
						{t("privacyPolicy.sections.whoWeAre.body")}
					</p>
				</section>

				<section className="mb-10">
					<h2 className="font-display text-xl mb-3">{t("privacyPolicy.sections.infoWeCollect.heading")}</h2>
					<ul className="list-disc list-inside text-white/80 text-sm leading-relaxed space-y-2">
						<li><Trans i18nKey="privacyPolicy.sections.infoWeCollect.account" components={{ strong: <strong className="text-white" /> }} /></li>
						<li><Trans i18nKey="privacyPolicy.sections.infoWeCollect.profile" components={{ strong: <strong className="text-white" /> }} /></li>
						<li><Trans i18nKey="privacyPolicy.sections.infoWeCollect.activity" components={{ strong: <strong className="text-white" /> }} /></li>
						<li><Trans i18nKey="privacyPolicy.sections.infoWeCollect.social" components={{ strong: <strong className="text-white" /> }} /></li>
						<li><Trans i18nKey="privacyPolicy.sections.infoWeCollect.technical" components={{ strong: <strong className="text-white" /> }} /></li>
					</ul>
				</section>

				<section className="mb-10">
					<h2 className="font-display text-xl mb-3">{t("privacyPolicy.sections.howWeUse.heading")}</h2>
					<p className="text-white/80 text-sm leading-relaxed">
						{t("privacyPolicy.sections.howWeUse.body")}
					</p>
				</section>

				<section className="mb-10">
					<h2 className="font-display text-xl mb-3">{t("privacyPolicy.sections.howWeProtect.heading")}</h2>
					<p className="text-white/80 text-sm leading-relaxed">
						{t("privacyPolicy.sections.howWeProtect.body")}
					</p>
				</section>

				<section className="mb-10">
					<h2 className="font-display text-xl mb-3">{t("privacyPolicy.sections.yourRights.heading")}</h2>
					<p className="text-white/80 text-sm leading-relaxed">
						{t("privacyPolicy.sections.yourRights.body")}
					</p>
				</section>

				<section>
					<h2 className="font-display text-xl mb-3">{t("privacyPolicy.sections.changes.heading")}</h2>
					<p className="text-white/80 text-sm leading-relaxed">
						{t("privacyPolicy.sections.changes.body")}
					</p>
				</section>
			</div>
		</div>
	);
}
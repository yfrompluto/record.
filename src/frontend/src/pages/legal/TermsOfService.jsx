// ==================================================================
//          Terms of Service page.
//          Sets out the rules users agree to when using Record.
// ==================================================================
import { useTranslation, Trans } from "react-i18next";

export default function TermsOfService() {
	const { t } = useTranslation();

	return (
	<div className="bg-brown-dark text-white min-h-screen">
	{/* <div tabIndex={0} className="bg-brown-dark text-white min-h-screen focus:outline-none focus-visible:outline-2 focus-visible:outline-orange focus-visible:-outline-offset-2"> */}
		<div className="max-w-3xl mx-auto px-6 py-16">
			<h1 className="font-display text-3xl mb-2">{t("termsOfService.title")}</h1>
			<p className="text-white/60 text-sm mb-10">{t("termsOfService.lastUpdated")}</p>

				<section className="mb-10">
					<h2 className="font-display text-xl mb-3">{t("termsOfService.sections.acceptance.heading")}</h2>
					<p className="text-white/80 text-sm leading-relaxed">
						{t("termsOfService.sections.acceptance.body")}
					</p>
				</section>

				<section className="mb-10">
					<h2 className="font-display text-xl mb-3">{t("termsOfService.sections.accountResponsibilities.heading")}</h2>
					<ul className="list-disc list-inside text-white/80 text-sm leading-relaxed space-y-2">
						<li>{t("termsOfService.sections.accountResponsibilities.item1")}</li>
						<li>{t("termsOfService.sections.accountResponsibilities.item2")}</li>
						<li>{t("termsOfService.sections.accountResponsibilities.item3")}</li>
						<li>{t("termsOfService.sections.accountResponsibilities.item4")}</li>
					</ul>
				</section>

				<section className="mb-10">
					<h2 className="font-display text-xl mb-3">{t("termsOfService.sections.acceptableUse.heading")}</h2>
					<p className="text-white/80 text-sm leading-relaxed mb-3">
						{t("termsOfService.sections.acceptableUse.intro")}
					</p>
					<ul className="list-disc list-inside text-white/80 text-sm leading-relaxed space-y-2">
						<li>{t("termsOfService.sections.acceptableUse.item1")}</li>
						<li>{t("termsOfService.sections.acceptableUse.item2")}</li>
						<li>{t("termsOfService.sections.acceptableUse.item3")}</li>
						<li>{t("termsOfService.sections.acceptableUse.item4")}</li>
					</ul>
				</section>

				<section className="mb-10">
					<h2 className="font-display text-xl mb-3">{t("termsOfService.sections.content.heading")}</h2>
					<p className="text-white/80 text-sm leading-relaxed">
						{t("termsOfService.sections.content.body")}
					</p>
				</section>

				<section className="mb-10">
					<h2 className="font-display text-xl mb-3">{t("termsOfService.sections.availability.heading")}</h2>
					<p className="text-white/80 text-sm leading-relaxed">
						<Trans
						i18nKey="termsOfService.sections.availability.body"
						components={{
						statusPageLink: (
							<a
							href="/status"
							className="text-orange underline decoration-orange/60 underline-offset-2 hover:decoration-orange focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
							// className="text-orange hover:underline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
							/>
						),
						}}
						/>
					</p>
				</section>

				<section className="mb-10">
					<h2 className="font-display text-xl mb-3">{t("termsOfService.sections.termination.heading")}</h2>
					<p className="text-white/80 text-sm leading-relaxed">
						{t("termsOfService.sections.termination.body")}
					</p>
				</section>

				<section>
					<h2 className="font-display text-xl mb-3">{t("termsOfService.sections.changes.heading")}</h2>
					<p className="text-white/80 text-sm leading-relaxed">
						{t("termsOfService.sections.changes.body")}
					</p>
				</section>
			</div>
		</div>
	);
}
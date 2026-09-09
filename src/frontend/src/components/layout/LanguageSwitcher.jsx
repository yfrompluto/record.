import { useTranslation } from "react-i18next"

const LANGUAGES = [
	{ code: 'en', label: 'EN' },
	{ code: 'fr', label: 'FR' },
	{ code: 'ja', label: '日本語'},
]

export default function LanguageSwitcher() {
	const { t, i18n } = useTranslation()

	return (
		<div className="flex items-center gap-2">
			<label
				htmlFor="language"
				className="sr-only"
			>
				{t("languageSwitcher.label")}
			</label>

			<select
				id="language"
				value={i18n.language}
				onChange={(e) => i18n.changeLanguage(e.target.value)}
				className="h-7 bg-transparent border border-mauve/25 rounded px-2 font-body text-xs text-white/70 hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
			>
				{LANGUAGES.map((lang) => (
					<option
						key={lang.code}
						value={lang.code}
						className="bg-brown-dark text-white"
					>
						{lang.label}
					</option>
				))}
			</select>
		</div>
	)
}
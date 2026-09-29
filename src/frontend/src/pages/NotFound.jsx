// =============================================
//		Default 404 fallaback
// =============================================

import { useTranslation } from "react-i18next";

export default function NotFound() {
	const { t } = useTranslation();

	return (
		<>
			<h1>404</h1>
			<p>{t("notFound.pageNotFound")}</p>
		</>
	);
}
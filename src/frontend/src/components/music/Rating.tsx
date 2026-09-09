import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

interface StarRatingProps {
	value: number;
	onChange?: (score: number) => void;
	readOnly?: boolean;
	size?: "track_stars" | "album_stars" | "rec_stars";
	label: string;
	color?: "orange" | "mustard"
}

const STAR_COUNT = 5;
const STEP = 0.5;

const SIZE_CLASSES = {
	track_stars: "w-5 h-5",
	album_stars: "w-6 h-6",
	rec_stars: "w-3 h-3",
};

function Star({
	fillPercent,
	sizeClass,
	active,
	color,
}: {
	fillPercent: number;
	sizeClass: string;
	active: boolean;
	color: "orange" | "mustard";
}) {
	const clipId = useId();

	const fillClass = color === "mustard" ? "fill-mustard" : "fill-orange";
	const strokeClass = color === "mustard" ? "stroke-mustard" : "stroke-orange";

	return (
		<svg
			viewBox="0 0 24 24"
			className={`${sizeClass} transition-transform duration-3 ease-out ${
				active ? "scale-105" : "scale-100"
			}`}
			aria-hidden="true"
		>
			<defs>
				<clipPath id={clipId}>
					<rect
						x="0"
						y="0"
						width={24 * (fillPercent / 100)}
						height="24"
					/>
				</clipPath>
			</defs>

			<path
				d="M12 2.5l2.9 6.26 6.9.62-5.2 4.6 1.55 6.77L12 17.13l-6.15 3.62 1.55-6.77-5.2-4.6 6.9-.62L12 2.5z"
				className={`fill-none transition-all duration-300 ease-out ${
					active ? strokeClass : "stroke-white/20"
				}`}
				strokeWidth={active ? 1.2 : 1}
			/>

			<path
				d="M12 2.5l2.9 6.26 6.9.62-5.2 4.6 1.55 6.77L12 17.13l-6.15 3.62 1.55-6.77-5.2-4.6 6.9-.62L12 2.5z"
				className={`${fillClass} transition-all duration-300 ease-out`}
				clipPath={`url(#${clipId})`}
			/>
		</svg>
	);
}

function clampToStep(v: number) {
	const clamped = Math.min(Math.max(v, 0), STAR_COUNT);
	return Math.round(clamped / STEP) * STEP;
}

export default function StarRating({
	value,
	onChange,
	readOnly = false,
	size = "album_stars",
	label,
	color = "mustard",
}: StarRatingProps) {
	const { t } = useTranslation();
	const [hoverValue, setHoverValue] = useState<number | null>(null);

	const displayValue = hoverValue ?? value;
	const sizeClass = SIZE_CLASSES[size];

	function commit(next: number) {
		setHoverValue(null);
		onChange?.(clampToStep(next));
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (readOnly)
         return;

		switch (e.key) {
			case "ArrowRight":
			case "ArrowUp":
				e.preventDefault();
				commit(value + STEP);
				break;
			case "ArrowLeft":
			case "ArrowDown":
				e.preventDefault();
				commit(value - STEP);
				break;
			case "Home":
				e.preventDefault();
				commit(0.5);
				break;
			case "End":
				e.preventDefault();
				commit(STAR_COUNT);
				break;
			default:
				break;
		}
	}

	const stars = Array.from({ length: STAR_COUNT }, (_, i) => {
		const fillPercent = Math.min(Math.max(displayValue - i, 0), 1) * 100;
		const active = value >= i + 1 || value === i + 0.5;

		return (
			<span key={i} className="relative inline-block leading-none">
				<Star
					fillPercent={fillPercent}
					sizeClass={sizeClass}
					active={active}
					color={color}
				/>

				{!readOnly && (
					<>
						<button
							type="button"
							tabIndex={-1}
							onClick={() => commit(i + 0.5)}
							onMouseEnter={() => setHoverValue(i + 0.5)}
							onFocus={() => setHoverValue(i + 0.5)}
							aria-hidden="true"
							className="absolute inset-y-0 left-0 w-1/2"
						/>

						<button
							type="button"
							tabIndex={-1}
							onClick={() => commit(i + 1)}
							onMouseEnter={() => setHoverValue(i + 1)}
							onFocus={() => setHoverValue(i + 1)}
							aria-hidden="true"
							className="absolute inset-y-0 right-0 w-1/2"
						/>
					</>
				)}
			</span>
		);
	});

	if (readOnly) {
		return (
			<div
				className="inline-flex items-center gap-0.5"
				role="img"
				aria-label={`${label}: ${value ? `${value} out of 5` : "not rated"}`}
			>
				{stars}
			</div>
		);
	}

	return (
		<div
			className="inline-flex items-center gap-0.5 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
			onMouseLeave={() => setHoverValue(null)}
			role="slider"
			tabIndex={0}
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={STAR_COUNT}
			aria-valuenow={value}
			aria-valuetext={t('rating.currentValue', { value, defaultValue: `${value} out of 5` })}
			onKeyDown={handleKeyDown}
		>
			{stars}
		</div>
	);
}
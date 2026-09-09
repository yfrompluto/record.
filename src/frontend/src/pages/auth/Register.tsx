// =====================================================================
//		Handle the authentication.
// 	Collect the user credentials, send them to the backend and redirect 
// 	users to the explore/home page.
// =====================================================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/layout/LanguageSwitcher';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { CoverSlideshow } from '../../components/covers/AlbumCoversSlide';


export default function Register() {
	const { t } = useTranslation();

	const PASSWORD_RULES = [
		{ key: 'minLength', test: (v: string) => v.length >= 8 },
		{ key: 'uppercase', test: (v: string) => /[A-Z]/.test(v) },
		{ key: 'lowercase', test: (v: string) => /[a-z]/.test(v) },
		{ key: 'digit', test: (v: string) => /[0-9]/.test(v) },
		{ key: 'specialChar', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
	];

	const [username, setUsername] = useState('');
	const [userMail, setUserMail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [passwordTouched, setPasswordTouched] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const { checkAuth } = useAuth();

	const isPasswordValid = PASSWORD_RULES.every((rule) => rule.test(password));

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();

		if (loading)
			return;

		setError(null);

		if (!isPasswordValid) {
			setPasswordTouched(true);
			setError('passwordInvalid');
			return;
		}

		setLoading(true);
		try {
			await api.register(username, userMail, password);
			await checkAuth();
			navigate('/home');
		} catch (err) {
			const status = (err as { status?: number })?.status;
			if (status === 409) {
				setError('conflict');
			} else if (status === 400) {
				setError('badRequest');
			} else {
				setError('generic');
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="grid grid-cols-1 lg:grid-cols-[420px_1fr] h-screen overflow-hidden bg-black font-body text-white">
			<div className="flex flex-col justify-center p-12 bg-gradient-to-br from-olive via-brown-dark to-brown overflow-hidden">
				<p className="font-display text-2xl text-orange mb-8">{t('auth.brand')}</p>
				<h1 className="font-display text-4xl mb-2">{t('auth.register.title')}</h1>
				<p className="text-white/60 text-sm mb-8">
					{t('auth.register.subtitle')}
				</p>

				<form onSubmit={handleSubmit} noValidate>
					<label
						className="block text-xs tracking-wider uppercase text-white/60 mb-1.5"
						htmlFor="username"
					>
						{t('auth.register.usernameLabel')}
					</label>
					<input
						id="username"
						name="username"
						type="text"
						autoComplete="username"
						aria-describedby="username-hint"
						className="w-full px-4 py-3 mb-1.5 bg-transparent border border-mauve/30 rounded-md text-white text-sm focus:outline-none focus:border-orange"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
					/>
					<p id="username-hint" className="text-white/60 text-xs mb-5">
						{t('auth.register.usernameHint')}
					</p>

					<label
						className="block text-xs tracking-wider uppercase text-white/60 mb-1.5"
						htmlFor="userMail"
					>
						{t('auth.register.emailLabel')}
					</label>
					<input
						id="userMail"
						name="userMail"
						type="email"
						autoComplete="email"
						className="w-full px-4 py-3 mb-5 bg-transparent border border-mauve/30 rounded-md text-white text-sm focus:outline-none focus:border-orange"
						value={userMail}
						onChange={(e) => setUserMail(e.target.value)}
					/>

					<label
						className="block text-xs tracking-wider uppercase text-white/60 mb-1.5"
						htmlFor="password"
					>
						{t('auth.register.passwordLabel')}
					</label>
					<div className="relative w-full mb-3">
						<input
						id="password"
						name="password"
						type={showPassword ? 'text' : 'password'}
						autoComplete="new-password"
						aria-describedby="password-requirements"
						aria-invalid={passwordTouched && !isPasswordValid}
						className="w-full px-4 py-3 pr-11 box-border bg-transparent border border-mauve/30 rounded-md text-white text-sm focus:outline-none focus:border-orange"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						onFocus={() => setPasswordTouched(true)}
						/>
						<button
						type="button"
						// className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center justify-center bg-transparent border-none text-white/60 cursor-pointer transition-colors hover:text-orange focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
						className="absolute right-0 top-0 h-full w-11 flex items-center justify-center bg-transparent border-none text-white/60 cursor-pointer transition-colors hover:text-orange focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
						onClick={() => setShowPassword(!showPassword)}
						aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
						aria-pressed={showPassword}
						>
						{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
						</button>
					</div>

					{password.length > 0 && (
						// <ul
						// 	id="password-requirements"
						// 	role="status"
						// 	aria-live="polite"
						// 	className="list-none p-0 mb-5 flex flex-col gap-1.5"
						// >
						<div id="password-requirements" role="status" aria-live="polite">
							<ul className="list-none p-0 mb-5 flex flex-col gap-1.5">
							

							{PASSWORD_RULES.map((rule) => (
								<li
									key={rule.key}
									className={`text-xs flex items-center gap-1.5 transition-colors ${
									rule.test(password) ? 'text-orange' : 'text-white/60'
									}`}
								>
									<span aria-hidden="true">{rule.test(password) ? '✓' : '✕'}</span>{' '}
									{t(`auth.register.passwordRules.${rule.key}`)}
									<span className="sr-only">
										{rule.test(password) ? t('common.valid') : t('common.invalid')}
									</span>
								</li>
							))}
							</ul>
						</div>
					)}
					
					{error && (
						<p className="text-orange text-sm -mt-2 mb-4" role="alert">
						{/* {error} */}
							{t(`auth.register.errors.${error}`)}
						</p>
					)}

					<button
						className="w-full py-3.5 rounded-md bg-orange text-black font-semibold uppercase tracking-wide text-sm cursor-pointer transition-colors hover:bg-midnight-violet hover:text-white disabled:bg-mauve/30 disabled:text-white/50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
						type="submit"
						disabled={loading || !isPasswordValid}
					>
						{loading ? t('auth.register.submitting') : t('auth.register.submit')}
					</button>
				</form>

				<p className="mt-6 text-sm text-white/60 text-center">
					{t('auth.register.hasAccount')}{' '}
					<Link
						to="/login"
						className="text-orange hover:underline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 rounded"
					>
						{t('auth.register.signInLink')}
					</Link>
				</p>
				<div className="mt-6 flex justify-center">
					<LanguageSwitcher />
				</div>
			</div>

			{/* Right panel — slideshow/scroll  covers, hidden when window gets smaller */}
			<div className="hidden lg:block relative h-screen overflow-hidden bg-gradient-to-tl from-olive via-brown-dark to-brown">
				<div
					className="absolute inset-y-0 left-0 w-10 z-10 pointer-events-none"
					style={{ background: "linear-gradient(to right, rgba(55, 18, 24, 0.12), transparent)" }}
				/>
				<CoverSlideshow />
			</div>
		</main>
	);
}
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

export default function Login() {
	const { t } = useTranslation();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [ showPassword, setShowPassword] = useState(false);
	// const [error, setError] = useState('');
	const [error, setError] = useState(false);
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate();
	const { checkAuth } = useAuth();

	// async function handleSubmit(e) {
	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();

		if (loading)
			return;

		setError(false);
		setLoading(true);

		try {
			await api.login(username, password);
			await checkAuth();
			navigate('/home');
		} catch (err) {
			setError(true);
		} finally {
			setLoading(false);
		}
 	}

  return (
		<main className="grid grid-cols-1 lg:grid-cols-[420px_1fr] h-screen overflow-hidden bg-black font-body text-white">
			{/* Left panel */}
			<div className="relative flex flex-col justify-center p-12 bg-gradient-to-br from-olive via-brown-dark to-brown overflow-hidden">
				<p className="mb-8 font-display text-2xl text-orange">
					{t('auth.brand')}
				</p>

				<h1 className="mb-2 font-display text-4xl">
						{t('auth.login.title')}
				</h1>

				<p className="mb-8 text-sm text-white/60">
						{t('auth.login.subtitle')}
				</p>

				<form onSubmit={handleSubmit} noValidate>
					<label
						htmlFor="username"
						className="mb-1.5 block text-xs uppercase tracking-wider text-white/60"
					>
						{t('auth.login.usernameLabel')}
					</label>

					<input
						id="username"
						name="username"
						type="text"
						autoComplete="username"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						className="mb-5 w-full rounded-md border border-mauve/30 bg-transparent px-4 py-3 text-sm text-white focus:border-orange focus:outline-none"
					/>

					<label
						htmlFor="password"
						className="mb-1.5 block text-xs uppercase tracking-wider text-white/60"
					>
						{t('auth.login.passwordLabel')}
					</label>

					<div className="relative w-full mb-5">
						<input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							autoComplete="current-password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-4 py-3 pr-11 box-border bg-transparent border border-mauve/30 rounded-md text-white text-sm focus:outline-none focus:border-orange"
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

					{error && (
						<p
						role="alert"
						className="-mt-2 mb-4 text-sm text-orange"
						>
						{t('auth.login.error')}
						</p>
					)}

					<button
						type="submit"
						disabled={loading}
						className="w-full cursor-pointer rounded-md bg-orange py-3.5 text-sm font-semibold uppercase tracking-wide text-black transition-colors hover:bg-midnight-violet hover:text-white disabled:cursor-not-allowed disabled:bg-mauve/30 disabled:text-white/50 focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
					>
						{loading ? t('auth.login.submitting') : t('auth.login.submit')}
					</button>
				</form>

				<p className="mt-6 text-center text-sm text-white/60">
					{t('auth.login.noAccount')}{' '}
					<Link
						to="/register"
						className="rounded text-orange hover:underline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
					>
						{t('auth.login.signUpLink')}
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
		// </div>
	);
}
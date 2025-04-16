import stylesheet from './app.css?url'

import type { Route } from './+types/root'

import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useNavigation } from 'react-router'
import React from 'react'

import { QueryClientProvider } from '@tanstack/react-query'

import type { LoadingBarRef } from 'react-top-loading-bar'
import LoadingBar from 'react-top-loading-bar'

import queryClient from '~/lib/query-instance'

import { ThemeProvider } from './providers/Theme'

const THEME_COOKIE_NAME = 'theme:state'

export const links: Route.LinksFunction = () => [
	{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
	{
		rel: 'preconnect',
		href: 'https://fonts.gstatic.com',
		crossOrigin: 'anonymous',
	},
	{
		rel: 'stylesheet',
		href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
	},
	{
		rel: 'stylesheet',
		href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Courgette&family=Tajawal:wght@200;300;400;500;700;800;900&display=swap',
	},
	{ rel: 'stylesheet', href: stylesheet },
]

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang='en'>
			<head>
				<meta charSet='utf-8' />
				<meta name='viewport' content='width=device-width, initial-scale=1' />

				{/* To avoid FOUC aka Flash of Unstyled Content */}
				<script
					dangerouslySetInnerHTML={{
						__html: `
							try {
								const cookieMatch = document.cookie.match(new RegExp("(^| )${THEME_COOKIE_NAME}=([^;]+)"))
								const cachedTheme = cookieMatch ? (cookieMatch[2]) : 'light'

								document.documentElement.classList.toggle('dark', cachedTheme === 'dark' || (!(document.cookie.match(new RegExp("(^| )${THEME_COOKIE_NAME}=([^;]+)"))) && window.matchMedia('(prefers-color-scheme: dark)').matches))
							} catch (_) {}
						`,
					}}
				/>

				<Meta />
				<Links />
			</head>
			<body className='overflow-x-hidden'>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}

export default function App() {
	const navigation = useNavigation()
	const loadingBarRef = React.useRef<LoadingBarRef>(null)

	React.useEffect(() => {
		if (navigation.state === 'loading' || navigation.state === 'submitting') {
			loadingBarRef.current?.continuousStart()
		}

		if (navigation.state === 'idle') {
			loadingBarRef.current?.complete()
		}
	}, [navigation.state])

	return (
		<React.Fragment>
			<LoadingBar ref={loadingBarRef} color='#5060dd' shadow={false} transitionTime={100} waitingTime={300} />

			<QueryClientProvider client={queryClient}>
				<ThemeProvider>
					<Outlet />
				</ThemeProvider>
			</QueryClientProvider>
		</React.Fragment>
	)
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = 'Oops!'
	let details = 'An unexpected error occurred.'
	let stack: string | undefined

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? '404' : 'Error'
		details = error.status === 404 ? 'The requested page could not be found.' : error.statusText || details
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message
		stack = error.stack
	}

	return (
		<main className='pt-16 p-4 container mx-auto'>
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className='w-full p-4 overflow-x-auto'>
					<code>{stack}</code>
				</pre>
			)}
		</main>
	)
}

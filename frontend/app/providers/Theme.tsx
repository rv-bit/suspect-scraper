import { createContext, useContext, useEffect, useState } from 'react'

const THEME_COOKIE_NAME = 'theme:state'
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 * 365 // 1 year

interface ThemeProvider {
	theme: 'dark' | 'light'
	setTheme: (theme: 'dark' | 'light') => void
}

interface ThemeProviderProps {
	children: React.ReactNode
}

export const ThemeContext = createContext<ThemeProvider | null>(null)
export const useTheme = () => {
	const context = useContext(ThemeContext)
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider')
	}

	const { theme, setTheme } = context
	return { theme, setTheme }
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
	const [theme, setThemeState] = useState<'dark' | 'light'>('light')
	const isClient = typeof window !== 'undefined'

	useEffect(() => {
		if (!isClient) return

		const cookieMatch = document.cookie.match(new RegExp(`(^| )${THEME_COOKIE_NAME}=([^;]+)`))
		const cachedTheme = cookieMatch ? (cookieMatch[2] as 'dark' | 'light') : 'light'

		setThemeState(cachedTheme)

		document.documentElement.classList.toggle('dark', cachedTheme === 'dark' || (!document.cookie.match(new RegExp(`(^| )${THEME_COOKIE_NAME}=([^;]+)`)) && window.matchMedia('(prefers-color-scheme: dark)').matches))
	}, [isClient])

	const setTheme = (newTheme: 'dark' | 'light') => {
		if (!isClient) return

		document.cookie = `${THEME_COOKIE_NAME}=${newTheme}; max-age=${THEME_COOKIE_MAX_AGE}; path=/`
		setThemeState(newTheme)

		document.documentElement.classList.toggle('dark', newTheme === 'dark' || (!document.cookie.match(new RegExp(`(^| )${THEME_COOKIE_NAME}=([^;]+)`)) && window.matchMedia('(prefers-color-scheme: dark)').matches))
	}

	return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

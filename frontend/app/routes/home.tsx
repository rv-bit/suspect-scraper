import type { Route } from './+types/home'

import axiosInstance from '~/lib/axios-instance'
import { Welcome } from '~/welcome/welcome'

export function meta({}: Route.MetaArgs) {
	return [{ title: 'New React Router App' }, { name: 'description', content: 'Welcome to React Router!' }]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const res = await axiosInstance.get(`/api/test`)
	const data = await res.data
	return data
}

export function HydrateFallback() {
	return <div>Loading...</div>
}

export default function Home() {
	return <Welcome />
}

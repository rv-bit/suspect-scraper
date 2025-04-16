import type { Route } from './+types/home'
import { useLoaderData } from 'react-router'

import axiosInstance from '~/lib/axios-instance'

import { Welcome } from '~/welcome/welcome'

export function meta({}: Route.MetaArgs) {
	return [{ title: 'New React Router App' }, { name: 'description', content: 'Welcome to React Router!' }]
}

type LoaderData = {
	message: string[]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const res = await axiosInstance.get(`/api/v0/`)
	const data = await res.data
	return {
		...data,
	}
}

export function HydrateFallback() {
	return <div>Loading...</div>
}

export default function Home() {
	const data = useLoaderData<LoaderData>()

	console.log(data.message)

	return <Welcome />
}

import type { Route } from "./+types/crime";
import React from "react";
import { useLoaderData, useMatches, useSearchParams } from "react-router";
import { APIProvider, Map } from '@vis.gl/react-google-maps';

import queryClient from "~/lib/query-instance";
import axiosInstance from "~/lib/axios-instance";

import { formatMonth } from "~/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

type LoaderAreaData = {
    data: {
        crimeType: string
        count: number
    }[]
    total: number
    area: string
}

const prefetchArea = async (id: string, year: string) => {
    await queryClient.prefetchQuery({
        queryKey: [`crime-data`, id, year],
        queryFn: async () => {
            const result = await axiosInstance.get(`/api/v0/${id}/getCrimeDataByMonth/${year}`);
            return {
                data: result.data.data,
                total: result.data.total,
                area: id,
            };
        },
        staleTime: 10 * 1000, // 30 seconds
    });
}

export async function loader({ params, request }: Route.LoaderArgs) {
    if (!params.id) {
        throw new Response("", { status: 404, headers: { Location: "/" } }); // Redirect to home if no area is provided
    }

    const url = new URL(request.url);
    const year = url.searchParams.get('year') as string;

    let cachedData = queryClient.getQueryData(['crime-data', params.id, year]) as LoaderAreaData;

    if (!cachedData) {
        await prefetchArea(params.id, year);
    } else {
        if (cachedData.area !== params.id) {
            await queryClient.invalidateQueries({
                queryKey: ['crime-data']
            });
    
            await prefetchArea(params.id, year);
        }
    }

    cachedData = queryClient.getQueryData(['crime-data', params.id, year]) as LoaderAreaData;

    return {
        data: cachedData.data || [],
        total: cachedData.total || 0,
        area: params.id,
    }
}

export async function clientLoader({ serverLoader, params }: Route.ClientLoaderArgs) {
	const serverData = await serverLoader();

	return {
        ...serverData
    }
}

export function HydrateFallback() {
	return <div>Loading...</div>
}

export default function Index() {
    const matches = useMatches();
    const loaderData = useLoaderData() as LoaderAreaData;
    const sharedData = matches[1].data as {
        dates: string[]
        area: string
    }

    const [searchParams, setSearchParams] = useSearchParams();

    const [currentDate, setCurrentDate] = React.useState<string>(sharedData.dates.sort().reverse()[0]);
    const [currentCrimeSelected, setCurrentCrimeSelected] = React.useState<string>('all');

    const handleChangeDate = (date: string) => {
        setCurrentDate(date);

        setSearchParams({ year: date });
    }

    return (
        <div className="flex justify-start items-start gap-2 w-full h-full max-w-[85rem]">

            <Card className="w-full h-full rounded-sm">
                <CardContent className="flex flex-col md:flex-row gap-5 w-full justify-start items-start">
                    <div className="w-2/2 h-full flex flex-col gap-2 justify-start items-start">
                        <CardHeader className="w-full gap-0 pl-0">
                            <CardTitle className="text-2xl">Hotspot Map</CardTitle>
                            <CardDescription>Hotspots are areas where estimated location of crime has occurred. They are identified using a variety of methods, including statistical analysis and machine learning algorithms.</CardDescription>
                        </CardHeader>
                        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                            <Map
                                style={{width: '100%', height: '35rem'}}
                                defaultCenter={{lat: 22.54992, lng: 0}}
                                defaultZoom={3}
                                gestureHandling={'greedy'}
                                disableDefaultUI={true}
                            />
                        </APIProvider>
                    </div>

                    <div className="w-full h-full gap-2 flex flex-col justify-start items-start">
                        <h1 className="text-lg">Edit crime type and time period</h1>

                        <Select value={currentCrimeSelected} onValueChange={setCurrentCrimeSelected}>
                            <SelectTrigger
                                className="w-full rounded-md py-5"
                                aria-label="Select a value"
                            >
                                <SelectValue placeholder="Last year" />
                            </SelectTrigger>
                            <SelectContent className="rounded-md max-h-96">
                                <SelectItem value="all" className="rounded-md py-3">
                                    All crimes ({loaderData.total})
                                </SelectItem>
                                {loaderData.data.map((crime, index) => (
                                    <SelectItem key={index} value={crime.crimeType} className="rounded-md py-3">
                                        {crime.crimeType} ({crime.count})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={currentDate} onValueChange={(value) => handleChangeDate(value)}>
                            <SelectTrigger
                                className="w-full rounded-md py-5"
                                aria-label="Select a value"
                            >
                                <SelectValue placeholder="Last year" />
                            </SelectTrigger>
                            <SelectContent className="rounded-md max-h-96">
                                {sharedData.dates.sort().reverse().map((date) => (
                                    <SelectItem key={date} value={date} className="rounded-md py-3">
                                        {formatMonth(date)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

import type { Route } from "./+types/crime";
import React from "react";
import { useLoaderData, useMatches, useSearchParams } from "react-router";
import { type MapCameraChangedEvent, useMap, AdvancedMarker, APIProvider, Map, Pin } from '@vis.gl/react-google-maps';
import { type Marker, MarkerClusterer} from '@googlemaps/markerclusterer';

import queryClient from "~/lib/query-instance";
import axiosInstance from "~/lib/axios-instance";

import { chunkArray, formatMonth } from "~/lib/utils";

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

type Locations = { 
    key: string, 
    location: {
        lat: number
        lng: number
    }, 
    locationNear: string 
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

    const map = useMap();
    const clusterer = React.useRef<MarkerClusterer | null>(null);
    const [markers, setMarkers] = React.useState<{[key: string]: Marker}>({});

    const [currentDate, setCurrentDate] = React.useState<string>(sharedData.dates.sort().reverse()[0]);
    const [currentCrimeSelected, setCurrentCrimeSelected] = React.useState<string>('all');

    const [locations, setLocations] = React.useState<Locations[]>([]);
    const [loading, setLoading] = React.useState<boolean>(false);

    const handleSetMarkerRef = (marker: Marker | null, key: string) => {
        if (marker && markers[key]) return;
        if (!marker && !markers[key]) return;

        setMarkers(prev => {
            if (marker) {
                return {...prev, [key]: marker};
            } else {
                const newMarkers = {...prev};
                delete newMarkers[key];
                return newMarkers;
            }
        });
    };

    const handleChangeDate = (date: string) => {
        setCurrentDate(date);
        setSearchParams({ year: date });
    }

    const handleChangeDataCrime = React.useCallback( async (crime: string) => {
        setCurrentCrimeSelected(crime);

        const cachedData = queryClient.getQueryData([`locationsByCrime`, crime, sharedData.area, currentDate]) as Locations[];

        if (cachedData) {
            setLocations(cachedData);
            return;
        }

        setLoading(true);

        const result = await axiosInstance.get(`/api/v0/${sharedData.area}/getCrimeDataByCrime/${currentDate}/${crime}`);
        const data = result.data.data;

        queryClient.setQueryData(["latestCrimesChartData", crime, sharedData.area, currentDate], data);

        const chunks = chunkArray<Locations>(data, 100);
        let finalArray: Locations[] = [];

        if (chunks.length >= 2) {
            finalArray = chunks.flat();
        } else {
            finalArray = data.map((location: Locations) => ({
                key: location.key,
                location: {
                    lat: location.location.lat,
                    lng: location.location.lng
                },
                locationNear: location.locationNear
            }));
        }

        setLoading(false);
        setLocations(finalArray);
    }, [sharedData.area, currentDate]);

    React.useEffect(() => {
        if (!map) return;

        if (!clusterer.current) {
            clusterer.current = new MarkerClusterer({map});
        }
    }, [map]);

    React.useEffect(() => {
        clusterer.current?.clearMarkers();
        clusterer.current?.addMarkers(Object.values(markers));
    }, [locations, markers]);

    const safeLocations = React.useMemo(() => {
        return locations.flat?.() ?? locations;
    }, [locations]);

    return (
        <div className="flex justify-start items-start gap-2 w-full h-full max-w-[85rem]">

            {loading && (
                <div className="z-99 absolute top-0 left-0 h-full w-full  bg-black/20">
                    <svg className="text-gray-300 animate-spin" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"width="24" height="24">
                        <path
                            d="M32 3C35.8083 3 39.5794 3.75011 43.0978 5.20749C46.6163 6.66488 49.8132 8.80101 52.5061 11.4939C55.199 14.1868 57.3351 17.3837 58.7925 20.9022C60.2499 24.4206 61 28.1917 61 32C61 35.8083 60.2499 39.5794 58.7925 43.0978C57.3351 46.6163 55.199 49.8132 52.5061 52.5061C49.8132 55.199 46.6163 57.3351 43.0978 58.7925C39.5794 60.2499 35.8083 61 32 61C28.1917 61 24.4206 60.2499 20.9022 58.7925C17.3837 57.3351 14.1868 55.199 11.4939 52.5061C8.801 49.8132 6.66487 46.6163 5.20749 43.0978C3.7501 39.5794 3 35.8083 3 32C3 28.1917 3.75011 24.4206 5.2075 20.9022C6.66489 17.3837 8.80101 14.1868 11.4939 11.4939C14.1868 8.80099 17.3838 6.66487 20.9022 5.20749C24.4206 3.7501 28.1917 3 32 3L32 3Z"
                            stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"></path>
                        <path
                            d="M32 3C36.5778 3 41.0906 4.08374 45.1692 6.16256C49.2477 8.24138 52.7762 11.2562 55.466 14.9605C58.1558 18.6647 59.9304 22.9531 60.6448 27.4748C61.3591 31.9965 60.9928 36.6232 59.5759 40.9762"
                            stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900">
                        </path>
                    </svg>
                </div>
            )}

            <Card className="w-full h-full rounded-sm">
                <CardContent className="flex flex-col md:flex-row gap-5 w-full justify-start items-start">
                    <div className="w-2/2 h-full flex flex-col gap-2 justify-start items-start">
                        <CardHeader className="w-full gap-0 pl-0">
                            <CardTitle className="text-2xl">Hotspot Map</CardTitle>
                            <CardDescription>Hotspots are areas where estimated location of crime has occurred. They are identified using a variety of methods, including statistical analysis and machine learning algorithms.</CardDescription>
                        </CardHeader>                        
                            <Map
                                mapId={import.meta.env.VITE_GOOGLE_MAPS_ID}
                                style={{width: '100%', height: '35rem'}}
                                defaultCenter={{ lat: 55.3781, lng: -3.4360 }}
                                defaultZoom={3}
                                gestureHandling={'greedy'}
                                disableDefaultUI={true}
                                onCameraChanged={(ev: MapCameraChangedEvent) =>
                                    console.log('camera changed:', ev.detail.center, 'zoom:', ev.detail.zoom)
                                }
                            >
                                {safeLocations.map((location) => {
                                    if (!location.location) return null;
                                    if (!location.location.lat || !location.location.lng) return null;

                                    return (
                                        <AdvancedMarker
                                            key={location.key}
                                            position={location.location}
                                            ref={marker => handleSetMarkerRef(marker, location.key)}

                                            clickable={true}
                                            onClick={(e) => {
                                                e.stop();

                                                console.log('clicked marker:', location.key);
                                            }}
                                        >
                                            <Pin background={'#FBBC04'} glyphColor={'#000'} borderColor={'#000'} />
                                        </AdvancedMarker>
                                    )
                                })}
                            </Map>
                        </div>

                        <div className="w-full h-full gap-2 flex flex-col justify-start items-start">
                            <h1 className="text-lg">Edit crime type and time period</h1>

                            <Select value={currentCrimeSelected} onValueChange={(value => handleChangeDataCrime(value))}>
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

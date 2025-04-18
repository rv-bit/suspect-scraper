import type { Route } from "./+types/crime";

import { APIProvider, Map } from '@vis.gl/react-google-maps';

import queryClient from "~/lib/query-instance";
import axiosInstance from "~/lib/axios-instance";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

type LoaderAreaData = {
    data: any[]
    area: string
}

// const prefetchArea = async (id: string) => {
//     await queryClient.prefetchQuery({
//         queryKey: [`crime-${id}`],
//         queryFn: async () => {
//             const result = await axiosInstance.get(`/api/v0/${id}`);
//             return {
//                 data: result.data.data,
//                 area: id,
//             };
//         },
//         staleTime: 10 * 1000, // 30 seconds
//     });
// }

// export async function loader({ params, request }: Route.LoaderArgs) {
//     if (!params.id) {
//         throw new Response("", { status: 404, headers: { Location: "/" } }); // Redirect to home if no area is provided
//     }

//     let cachedData = queryClient.getQueryData(['area']) as LoaderAreaData;

//     if (!cachedData) {
//         await prefetchArea(params.id);
//     } else {
//         if (cachedData.area !== params.id) {
//             await queryClient.invalidateQueries({
//                 queryKey: ['area']
//             });
    
//             await prefetchArea(params.id);
//         }
//     }

//     cachedData = queryClient.getQueryData(['area']) as LoaderAreaData;

//     return {
//         data: cachedData.data || [],
//         area: params.id,
//     }
// }

// export async function clientLoader({ serverLoader, params }: Route.ClientLoaderArgs) {
// 	const serverData = await serverLoader();

// 	return {
//         ...serverData
//     }
// }

// export function HydrateFallback() {
// 	return <div>Loading...</div>
// }

export default function Index({
    loaderData,
}: Route.ComponentProps) {
    // const { data, area } = loaderData;

    // console.log('crime',data, area);

    return (
        <div className="flex justify-start items-start gap-2 w-full h-full max-w-7xl">

            <Card className="w-full h-full rounded-sm">
                <CardContent className="flex flex-row w-full justify-start items-start">
                    <div className="w-2/2 h-full flex flex-col gap-2 justify-start items-start">
                        <CardHeader className="w-full gap-0 pl-0">
                            <CardTitle className="text-2xl">Hotspot Map</CardTitle>
                            <CardDescription>Hotspots are areas where crime is more likely to occur. They are identified using a variety of methods, including statistical analysis and machine learning algorithms.</CardDescription>
                        </CardHeader>
                        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                            <Map
                                style={{width: '100%', height: '30rem'}}
                                defaultCenter={{lat: 22.54992, lng: 0}}
                                defaultZoom={3}
                                gestureHandling={'greedy'}
                                disableDefaultUI={true}
                            />
                        </APIProvider>
                    </div>

                    <div className="w-full h-full flex justify-center items-center">
                        <p className="text-sm text-gray-500">Map showing the hotspots for the selected area.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

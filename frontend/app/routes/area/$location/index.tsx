import type { Route } from "./+types/index";

import queryClient from "~/lib/query-instance";
import axiosInstance from "~/lib/axios-instance";

import { TrendingUp } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "~/components/ui/card"

import {
    type ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "~/components/ui/chart"
import React from "react";
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

type LoaderAreaData = {
    lastMonthTopCrimes: {
        crimeType: string
        count: number
    }[]
    lastYearTotalsByMonth: {
        [month: string]: number; // Keys are strings (e.g., "2024-01"), values are numbers
    };
    topIncreaseFromPrev: number
    area: string
}

const prefetchArea = async (id: string) => {
    await queryClient.prefetchQuery({
        queryKey: [`area-overview`],
        queryFn: async () => {
            const result = await axiosInstance.get(`/api/v0/${id}`);

            if (result.status !== 200) {
                throw new Error("Failed to fetch data");
            }

            console.log('result', result);

            return {
                lastMonthTopCrimes: result.data.lastMonthTopCrimes,
                topIncreaseFromPrev: result.data.topIncreaseFromPrevMonth,
                lastYearTotalsByMonth: result.data.lastYearTotalsByMonth,
                area: id,
            };
        },
        staleTime: 10 * 1000, // 30 seconds
    });
}

export async function loader({ params }: Route.LoaderArgs) {
    if (!params.id) {
        throw new Response("", { status: 404, headers: { Location: "/" } }); // Redirect to home if no area is provided
    }

    let cachedData = queryClient.getQueryData([`area-overview`]) as LoaderAreaData;

    console.log('cachedData', cachedData ? cachedData.area : '', params.id);

    if (!cachedData) {
        await prefetchArea(params.id);
    } else {
        if (cachedData.area !== params.id) {
            await queryClient.invalidateQueries({
                queryKey: [`area-overview`],
            });
    
            await prefetchArea(params.id);
        }
    }

    cachedData = queryClient.getQueryData([`area-overview`]) as LoaderAreaData;

    return {
        lastMonthTopCrimes: cachedData.lastMonthTopCrimes || [],
        topIncreaseFromPrev: cachedData.topIncreaseFromPrev || 0,
        lastYearTotalsByMonth: cachedData.lastYearTotalsByMonth || [],
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


export default function Index({
    loaderData,
}: Route.ComponentProps) {
    const { lastMonthTopCrimes, lastYearTotalsByMonth, topIncreaseFromPrev, area } = loaderData;
    const [latestYearCrimesChartData, setYearLatestCrimesChartData] = React.useState(lastYearTotalsByMonth);

    const [timeRange, setTimeRange] = React.useState("2024");
    const [loading, setLoading] = React.useState(false);

    const latestLastMonthTopCrimesChartConfig = React.useMemo(() => {
        return {
            count: {
                label: "Count",
                color: "hsl(var(--chart-1))",
            },
            crimeType: {
                label: "Crime Type",
                color: "hsl(var(--chart-2))",
            },
            label: {
                color: "hsl(var(--background))",
            },
        } satisfies ChartConfig
    }, []);

    const latestCrimesChartConfig = React.useMemo(() => {
        return {
            count: {
                label: "Count",
                color: "hsl(var(--chart-1))",
            },
            label: {
                color: "hsl(var(--background))",
            },
        } satisfies ChartConfig
    }, []);

    const latestLastMonthTopCrimesChartData =  React.useMemo(() => {
        return lastMonthTopCrimes.map((crime) => ({
            crimeType: crime.crimeType,
            count: crime.count,
        }))
    }, [area]);

    const latestCrimesChartData = React.useMemo(() => {
        const data = Object.entries(latestYearCrimesChartData).filter((month) => { 
            const [year, monthIndex] = month[0].split("-").map(Number);
            return year.toString() === timeRange;
        });

        return data.map(([month, number]) => ({
            date: month,
            count: number,
        }))
    }, [area, latestYearCrimesChartData]);

    const handleChangeTimeRange = (value: string) => {
        setTimeRange(value);

        console.log('value', value);

        const cachedData = queryClient.getQueryData([`latestCrimesChartData`, area, value]) as {
            [month: string]: number;
        };

        if (cachedData) {
            setYearLatestCrimesChartData(cachedData);
            return;
        }

        const res = axiosInstance.get(`/api/v0/${area}/getDataByMonth/${value}`);
        setLoading(true);

        res.then((result) => {
            const data = result.data.data;
            queryClient.setQueryData(["latestCrimesChartData", area, value], data);

            setLoading(false);
            setYearLatestCrimesChartData(data);
        });
    }

    return (
        <div className="flex justify-start items-start gap-2 w-full h-full max-w-7xl">
            <div className="h-[30rem] w-full flex justify-start items-start gap-5">
                <Card className="h-full">
                    <CardHeader className="gap-0">
                        <CardTitle className="text-2xl">Top reported crimes</CardTitle>
                        <CardDescription>Most commonly reported crimes during Dec 2024</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={latestLastMonthTopCrimesChartConfig}>
                            <BarChart
                                accessibilityLayer
                                data={latestLastMonthTopCrimesChartData}
                                layout="vertical"
                                margin={{
                                    right: 16,
                                }}
                            >
                                <CartesianGrid horizontal={false} />
                                <YAxis
                                    dataKey="crimeType"
                                    type="category"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={(value) => value.slice(0, 3)}
                                    hide
                                />
                                <XAxis dataKey="count" type="number" hide />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent indicator="line" />}
                                />
                                <Bar
                                    dataKey="count"
                                    layout="vertical"
                                    fill="var(--color-blue-400)"
                                    radius={4}
                                >
                                    <LabelList
                                        dataKey="crimeType"
                                        position="insideLeft"
                                        fill="var(--color-white)"
                                        className="fill-[--color-white]"
                                        fontSize={13}
                                    />
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-start justify-end gap-5 text-sm">
                        <span className="flex flex-col gap-0 justify-start items-start">    
                            <span className="font-medium leading-none">
                                {topIncreaseFromPrev > 0 ? "Increased" : "Decreased"} up by
                                    <span className="px-1">
                                        <span className="text-red-500 font-semibold">
                                            {topIncreaseFromPrev.toFixed(2)}
                                        </span>
                                        <span className="text-muted-foreground">%</span>
                                    </span>
                                from previous month <TrendingUp className="size-4" />
                            </span>
                            <span className="leading-none text-muted-foreground">
                                Showing data for {area} in Dec 2024
                            </span>
                        </span>
                        <Button
                            className="text-lg font-semibold min-h-10 h-auto wrap-anywhere w-auto rounded-sm whitespace-normal justify-start"
                            onClick={() => {
                                // window.open(`https://www.police.uk/pu/your-area/${params ? params.id : ""}/`, "_blank");
                            }}
                        >
                            <p className="text-left break-all text-sm font-light">View more</p>
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="w-2/3 h-full pt-0">
                    <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row [.border-b]:pb-0">
                        <div className="flex flex-1 flex-col justify-center gap-0 px-6 py-5 sm:py-6">
                            <CardTitle className="text-2xl">Amount of Reported Crimes</CardTitle>
                            <CardDescription>
                                Showing total visitors for the last {timeRange} months
                            </CardDescription>
                        </div>

                        <div className="px-6 py-5 sm:py-6 flex flex-col justify-end items-end">
                            <Select value={timeRange} onValueChange={(value) => {
                                handleChangeTimeRange(value);
                            }}>
                                <SelectTrigger
                                    className="w-[160px] rounded-lg sm:ml-auto"
                                    aria-label="Select a value"
                                >
                                    <SelectValue placeholder="Last year" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="2024" className="rounded-lg">
                                        Last year
                                    </SelectItem>
                                    <SelectItem value="2023" className="rounded-lg">
                                        Last 2 years
                                    </SelectItem>
                                    <SelectItem value="2022" className="rounded-lg">
                                        Last 3 years
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 sm:p-6">
                        <ChartContainer
                            config={latestCrimesChartConfig}
                            className="aspect-auto h-[250px] min-w-96 w-full"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
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
                            ): (
                                
                                <BarChart
                                    accessibilityLayer
                                    data={latestCrimesChartData}
                                    margin={{
                                        left: 12,
                                        right: 12,
                                    }}
                                >
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        minTickGap={32}
                                        tickFormatter={(value) => {
                                            const date = new Date(value)
                                            return date.toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                            })
                                        }}
                                    />
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                className="w-[150px]"
                                                nameKey="count"
                                                labelFormatter={(value) => {
                                                    return new Date(value).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })
                                                }}
                                            />
                                        }
                                    />
                                    <Bar dataKey="count" fill="var(--color-blue-400)" radius={4}/>
                                </BarChart>
                            )}
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
import React from 'react'
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { APIProvider } from '@vis.gl/react-google-maps'

import queryClient, { idbPersister } from "./lib/query-instance";

export default function Providers({children}: {children: React.ReactNode}) {
    return (
        <PersistQueryClientProvider client={queryClient} persistOptions={{persister: idbPersister}}>
            <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                {children}
            </APIProvider>
        </PersistQueryClientProvider>
    )
}

import { QueryClient } from "@tanstack/react-query";
import { type PersistedClient, type Persister } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";

function createIDBPersister(idbValidKey: IDBValidKey = "reactQuery") {
	return {
		persistClient: async (client: PersistedClient) => {
			await set(idbValidKey, client);
		},
		restoreClient: async () => {
			return await get<PersistedClient>(idbValidKey);
		},
		removeClient: async () => {
			await del(idbValidKey);
		},
	} satisfies Persister;
}

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 60 * 24, // 24 hours
			staleTime: 1000 * 60 * 1, // 1 minute
			refetchInterval: 1000 * 30, // 30 seconds
			refetchOnWindowFocus: true,
			refetchOnReconnect: true,
		},
	},
});

export const idbPersister = createIDBPersister();
export default queryClient;
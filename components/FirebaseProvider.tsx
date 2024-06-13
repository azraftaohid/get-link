"use client";

import { WithChildren } from "@/utils/children";
import { initFirebase } from "@/utils/firebase";
import { getStorage } from "@/utils/storage";
import { getAuth } from "firebase/auth";
import { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "react-query";

export default function FirebaseProvider({ children }: WithChildren) {
	const firebase = initFirebase();
	getStorage().bindAuth(getAuth(firebase));

	const queryClient = useMemo(() => new QueryClient(), []);
	
	return <QueryClientProvider client={queryClient}>
		{children}
	</QueryClientProvider>;
}

"use client";

import { initAuth } from "@/utils/auths";
import { WithChildren } from "@/utils/children";
import { initFirebase } from "@/utils/firebase";
import { initFirestore } from "@/utils/firestore";
import { initFunctions } from "@/utils/functions";
import { getStorage } from "@/utils/storage";
import { getAuth } from "firebase/auth";
import { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "react-query";

export default function FirebaseProvider({ children }: WithChildren) {
	const firebase = initFirebase();
	initAuth(firebase);
	initFunctions(firebase);
	initFirestore(firebase);
	
	getStorage().bindAuth(getAuth(firebase));

	const queryClient = useMemo(() => new QueryClient(), []);
	
	return <QueryClientProvider client={queryClient}>
		{children}
	</QueryClientProvider>;
}

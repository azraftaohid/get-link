import { User, getAuth } from "firebase/auth";
import { useEffect, useState } from "react";

export const useUser = (): UseUser => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setLoading] = useState(true);

	useEffect(() => {
		const auth = getAuth();
		auth.authStateReady().then(() => {
			console.debug("Initial auth state settled: ", auth.currentUser?.uid);
			setUser(auth.currentUser);
			setLoading(false);
		});

		return auth.onAuthStateChanged(setUser);
	}, []);

	return { user, isLoading };
};

export interface UseUser {
	user: User | null,
	isLoading: boolean,
}

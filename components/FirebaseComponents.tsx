import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import React from "react";
import { AuthProvider, FirestoreProvider, useFirebaseApp } from "reactfire";

export const FirebaseComponents: React.FunctionComponent<FirebaseComponentsProps> = ({ children }) => {
	const app = useFirebaseApp();

	return <AuthProvider sdk={getAuth(app)}>
		<FirestoreProvider sdk={getFirestore(app)}>
			{children}
		</FirestoreProvider>
	</AuthProvider>;
};

export type FirebaseComponentsProps = React.PropsWithChildren<{ /** */ }>;

import React from "react";
import { User } from "firebase/auth";
import { useUser } from "../../utils/useUser";
import { Loading } from "../Loading";
import { NotSignedIn } from "./NotSignedIn";

export const WithUser: React.FunctionComponent<WithUserProps> = ({ children }) => {
	const { user, isLoading } = useUser();
	return (user && (typeof children === "function" ? children(user) : children)) ||
		(isLoading && <Loading />) ||
		<NotSignedIn />;
};

export interface WithUserProps {
	children: ((user: User) => React.ReactNode) | React.ReactNode
}

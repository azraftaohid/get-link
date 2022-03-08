import { nanoid } from "nanoid";
import React, { useContext } from "react";

export const SessionId = React.createContext<SessionIdInterface>({ str: nanoid(10) });

export const useSessionId = () => {
	const hook = useContext(SessionId);
	return hook.str;
};

export interface SessionIdInterface {
	str: string,
}
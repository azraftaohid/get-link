import { useContext } from "react";
import { ToastContext } from "../pages/_app";

export const useToast = () => {
	return useContext(ToastContext);
};
import { SignInDialogContext } from "@/components/SignInDialog";
import { useContext } from "react";

export const useSignInPrompt = () => {
	return useContext(SignInDialogContext);
};

import { AssurePrompt } from "@/components/AssurePrompt";
import { ReauthDialog, UserWithEmail } from "@/components/ReauthDialog";
import { CardicForm } from "@/components/forms/CardicForm";
import TextField from "@/components/forms/TextField";
import { useToast } from "@/utils/useToast";
import { FirebaseError } from "firebase/app";
import { User, deleteUser, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import * as yup from "yup";

const nameSchema = yup.object().shape({
	name: yup.string()
		.max(128, "Name should be less than or equal to 128 characters long.")
		.min(1, "Name must be greater than 1 character long.")
		.matches(/^[a-z \-.,'/]+$/gi, "Name can only contain A-Z, a-z, . (dot), , (comma), and ' (apostrophe).")
		.trim()
		.required("This is a required field."),
});

export default function ProfileUpdateForm({
	user,
}: Readonly<ProfileUpdateFormProps>) {
	const router = useRouter();
	const { makeToast } = useToast();

	const [state, setState] = useState<"none" | "loading">("none");
	const [showDeletePrompt, setDeletePrompt] = useState(false);
	const [isDeleting, setDeleting] = useState(false);

	const [postReauthHandler, setPostReauthHandler] = useState<(() => unknown)>();

	const nameState = useRef({ name: user?.displayName || "" });
	const nameErrors = useRef({ name: "" });

	return <>
		<CardicForm
			className={"mt-4"}
			primaryText={"Display name"}
			footerText={"This will appear across the platform as your name."}
			initialValues={nameState.current}
			initialErrors={nameErrors.current}
			validationSchema={nameSchema}
			state={state}
			onSubmit={async (values) => {
				setState("loading");

				nameState.current = values;
				try {
					await updateProfile(user, { displayName: values.name });
				} catch (error) {
					console.error("User profile update failed:", error);
					makeToast("We were unable to update your display name.", "error");
				}

				setState("none");
			}}
			onReset={() => {
				setState("none");
			}}
			preventSubmit={({ values }) => values.name === user.displayName}
		>
			<TextField
				name={"name"}
				placeholder={"Must be less than 128 characters long"}
			/>
		</CardicForm>
		<CardicForm
			className={"mt-4"}
			variant={"danger"}
			primaryText={"Delete your account"}
			subsidiaryText={"We will delete the files and links you have created as well as your profile."}
			footerText={"The links you've shared will stop working."}
			submitText={"Delete"}
			initialValues={{}}
			state={isDeleting ? "loading" : "none"}
			onSubmit={() => setDeletePrompt(true)}
			preventSubmit={isDeleting}
		/>
		<AssurePrompt
			title={"Delete your account"}
			message={"Are you sure you want to permanently delete your account and all of its data?"}
			fullscreen={"md-down"}
			show={showDeletePrompt}
			confirmProps={{
				state: isDeleting ? "loading" : "none",
				disabled: isDeleting,
			}}
			onConfirm={async () => {
				const performDelete = async () => {
					setDeleting(true);
					try {
						await deleteUser(user);
					} finally {
						setDeleting(false);
					}

					makeToast("Your account is deleted successfully. It may take some time for things to propagate.", "info");
					// noinspection ES6MissingAwait
					router.push("/");
				};

				performDelete().catch((error) => {
					if ((error as FirebaseError).code === "auth/requires-recent-login") {
						console.debug("Requires user to reauthenticate.");
					} else {
						console.error("Error deleting user: ", error);
					}

					setDeletePrompt(false);
					setPostReauthHandler(() => () => performDelete().catch(error => {
						console.error("Error deleting user (post-reauth): ", error);
						makeToast("We were unable to delete your profile.", "error");
					}));
				});
			}}
			onCancel={async () => {
				setDeletePrompt(false);
			}}
		/>
		{user.email && <ReauthDialog
			user={user as UserWithEmail}
			show={!!postReauthHandler}
			onComplete={postReauthHandler}
			onHide={() => setPostReauthHandler(undefined)}
		/>}
	</>;
}

export interface ProfileUpdateFormProps {
	user: User,

}

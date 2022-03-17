import React from "react";
import Modal, { ModalProps } from "react-bootstrap/Modal";
import ModalBody from "react-bootstrap/ModalBody";
import ModalFooter from "react-bootstrap/ModalFooter";
import ModalHeader from "react-bootstrap/ModalHeader";
import ModalTitle from "react-bootstrap/ModalTitle";
import { combineCallbacks } from "../utils/func";
import { Button, ButtonProps } from "./Button";

export const AssurePrompt: React.FunctionComponent<AssurePromptProps> = ({ 
	title, 
	message,  
	onConfirm,
	onCancel, 
	confirmProps,
	cancelProps,
	...rest 
}) => {
	const { onClick: onConfirmClick, ...restConfirms } = confirmProps || { };
	const { onClick: onCancelClick, ...restCancels } = cancelProps || { };

	return <Modal 
		backdrop="static"
		keyboard
		onEscapeKeyDown={onCancel} // on dispute is not called if overriden by {...rest}
		aria-labelledby="confirmation prompt"
		{...rest}
	>
		<ModalHeader>
			<ModalTitle>{title}</ModalTitle>
		</ModalHeader>
		<ModalBody>
			{message}
		</ModalBody>
		<ModalFooter>
			<Button
				variant="outline-primary"
				onClick={combineCallbacks(onCancelClick, onCancel)}
				{...restCancels}
			>
				Cancel
			</Button>
			<Button
				variant="outline-secondary"
				onClick={combineCallbacks(onConfirmClick, onConfirm)}
				{...restConfirms}
			>
				Confirm
			</Button>
		</ModalFooter>
	</Modal>;
};

export interface AssurePromptProps extends ModalProps {
	title: React.ReactNode,
	message: React.ReactNode,
	onConfirm?: () => unknown,
	onCancel?: () => unknown,
	confirmProps?: ButtonProps,
	cancelProps?: ButtonProps,
}
import ButtonGroup, { ButtonGroupProps } from "react-bootstrap/ButtonGroup";
import DropdownButton from "react-bootstrap/DropdownButton";
import DropdownItem from "react-bootstrap/DropdownItem";
import { logClick } from "../utils/analytics";
import { CopyButton } from "./CopyButton";
import { Icon } from "./Icon";

const ShareButton: React.FunctionComponent<ShareButtonProps> = ({
	variant="outline-vivid",
	link,
	...rest
}) => {
	return <ButtonGroup {...rest}>
		<CopyButton
			variant={variant}
			content={link}
			left={<Icon name="link" size="sm" />}
			onClick={() => logClick("share")}
		>
			<span className="d-none d-md-inline">Share</span>
		</CopyButton>
		<DropdownButton as={ButtonGroup} id="share-options-dropdown" variant={variant} title="">
			<DropdownItem eventKey={"shortlink"}>Copy shortlink</DropdownItem>
		</DropdownButton>
	</ButtonGroup>;
};

export default ShareButton;

export interface ShareButtonProps extends ButtonGroupProps {
	variant?: string,
	link: string,
}

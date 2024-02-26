import React, { useEffect, useState } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Conditional } from "./Conditional";

export const ScrollToTop: React.FunctionComponent<ScrollToTopProps> = ({
	thresholdY = 140,
}) => {
	const [isVisible, setVisible] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			if (window.scrollY >= thresholdY) setVisible(true);
			else setVisible(false);
		};
		handleScroll();

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [thresholdY]);

	return <Conditional
		in={isVisible}
		containerProps={{
			className: "position-fixed bottom-0 end-0"
		}}
	>
		<Button
			className={"m-3"}
			variant={"secondary"}
			left={<Icon name={"arrow_upward_alt"} size={"sm"} />}
			onClick={() => {
				window.scrollTo({ top: 0, behavior: "smooth" });
			}}
		>
			Scroll to top
		</Button>
	</Conditional>;
};

export interface ScrollToTopProps {
	thresholdY?: number,
}

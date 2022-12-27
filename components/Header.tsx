import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavbarBrand from "react-bootstrap/NavbarBrand";
import NavbarCollapse from "react-bootstrap/NavbarCollapse";
import NavbarToggle from "react-bootstrap/NavbarToggle";
import NavLink from "react-bootstrap/NavLink";
import styles from "../styles/header.module.scss";
import { logClick } from "../utils/analytics";
import { mergeNames } from "../utils/mergeNames";
import { Theme, useTheme } from "../utils/useTheme";
import { Icon } from "./Icon";
import { RouteIndicator } from "./RouteIndicator";

const navs: { title: string; pathname: string }[] = [
	{
		title: "Home",
		pathname: "/",
	},
	{
		title: "Dashboard",
		pathname: "/dashboard",
	},
	{
		title: "About",
		pathname: "/about",
	},
];

export const Header: React.FunctionComponent<React.PropsWithChildren<unknown>> = () => {
	const router = useRouter();
	const { current: theme, setTheme } = useTheme();

	return (
		<>
			<Navbar id="nav" className={mergeNames(styles.main, "py-3")} expand="md" sticky="top">
				<Container id="nav-container" className={styles.container} fluid="xl">
					<NavbarBrand className="me-3 d-inline-flex align-items-center" href="/">
						<Image
							src={`/brand${theme === Theme.DARK ? "-light" : ""}.svg`}
							width={121.29}
							height={40}
							alt="Get-Link logo"
						/>
					</NavbarBrand>
					<NavbarToggle className="order-1" aria-controls="navbar-nav" />
					<NavbarCollapse id="navbar-nav">
						<Nav
							className={mergeNames(
								styles.navItems,
								"position-md-absolute top-md-50 start-md-50 translate-middle-md"
							)}
							activeKey={router.pathname}
						>
							{navs.map((nav) => (
								<Link key={nav.pathname} href={nav.pathname} prefetch={false} passHref>
									<NavLink eventKey={nav.pathname}>{nav.title}</NavLink>
								</Link>
							))}
						</Nav>
					</NavbarCollapse>
					<Icon
						role="button"
						className={"btn btn-outline-secondary order-0 order-md-2 ms-auto me-3 me-md-0"}
						name="dark_mode"
						tabIndex={1}
						onClick={() => {
							const newTheme = theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;

							setTheme(newTheme);
							logClick("toggle_theme", { to: newTheme });
						}}
					/>
				</Container>
			</Navbar>
			<RouteIndicator />
		</>
	);
};

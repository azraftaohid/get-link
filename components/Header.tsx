import Image from "next/image";
import { useRouter } from "next/router";
import { useCallback } from "react";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavbarBrand from "react-bootstrap/NavbarBrand";
import NavbarCollapse from "react-bootstrap/NavbarCollapse";
import NavbarToggle from "react-bootstrap/NavbarToggle";
import NavLink from "react-bootstrap/NavLink";
import styles from "../styles/header.module.scss";
import { mergeNames } from "../utils/mergeNames";
import { Theme, useTheme } from "../utils/useTheme";
import { Icon } from "./Icon";

const navs: { title: string, pathname: string }[] = [
	{
		title: "Home",
		pathname: "/",
	},
	{
		title: "About",
		pathname: "/about"
	}
];

export const Header: React.FunctionComponent = () => {
	const router = useRouter();
	const { current: theme, setTheme } = useTheme();

	const toggleTheme = () => setTheme(theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);
	const handleNav = useCallback((key: string | null) => {
		if (key) router.push(key);
	}, [router]);


	return <Navbar id="nav" className={mergeNames(styles.main, "py-3")} expand="md" sticky="top">
		<Container id="nav-container" className={styles.container} fluid="xl">
			<NavbarBrand className="me-3 d-inline-flex align-items-center" href="/">
				<Image
					src={`/brand${theme === Theme.DARK ? "-light" : ""}.svg`}
					width={121.29}
					height={40}
					alt="Get-Link logo"
				/>
			</NavbarBrand>
			<NavbarToggle className="order-1" aria-controls="navbar-nav"/>
			<NavbarCollapse id="navbar-nav">
				<Nav className={mergeNames(styles.navItems, "position-md-absolute top-md-50 start-md-50 translate-middle-md")} activeKey={router.pathname} onSelect={handleNav}>
					{navs.map(nav => <NavLink 
						key={nav.pathname} 
						eventKey={nav.pathname} 
					>
						{nav.title}
					</NavLink>)}
				</Nav>
			</NavbarCollapse>
			<Icon role="button" className={"btn btn-outline-secondary order-0 order-md-2 ms-auto me-3 me-md-0"} name="dark_mode" onClick={toggleTheme} />
		</Container>
	</Navbar>;
};
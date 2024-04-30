import { getAuth } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import NavLink from "react-bootstrap/NavLink";
import Navbar from "react-bootstrap/Navbar";
import NavbarBrand from "react-bootstrap/NavbarBrand";
import NavbarCollapse from "react-bootstrap/NavbarCollapse";
import NavbarToggle from "react-bootstrap/NavbarToggle";
import styles from "../styles/header.module.scss";
import { logClick } from "../utils/analytics";
import { mergeNames } from "../utils/mergeNames";
import { Theme, useTheme } from "../utils/useTheme";
import { useUser } from "../utils/useUser";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Image } from "./Image";
import { RouteIndicator } from "./RouteIndicator";
import { SignInDialog } from "./SignInDialog";

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
	const { user } = useUser();
	const { current: theme, setTheme } = useTheme();

	const [showSignIn, setSignIn] = useState(false);
	const [authReady, setAuthReady] = useState(false);

	useEffect(() => {
		getAuth().authStateReady().then(() => setAuthReady(true));
	}, []);

	return <>
		<Navbar id="nav" className={mergeNames(styles.main, "py-3")} expand="md" sticky="top">
			<Container id="nav-container" className={styles.container} fluid="xl">
				<NavbarBrand className="me-3 d-inline-flex align-items-center" href="/">
					<Image
						srcLight={"/brand.svg"}
						srcDark={"/brand-light.svg"}
						width={121.29}
						height={40}
						alt="Get-Link logo"
					/>
				</NavbarBrand>
				<NavbarToggle className="order-2" aria-controls="navbar-nav" />
				<NavbarCollapse id="navbar-nav">
					<Nav
						className={mergeNames(
							styles.navItems,
							"position-md-absolute top-md-50 start-md-50 translate-middle-md"
						)}
						activeKey={router.pathname}
					>
						{navs.map((nav) => (
							<Link
								key={nav.pathname}
								href={nav.pathname}
								prefetch={false}
								passHref
								legacyBehavior
							>
								<NavLink eventKey={nav.pathname}>{nav.title}</NavLink>
							</Link>
						))}
					</Nav>
				</NavbarCollapse>
				<Icon
					role="button"
					className={"btn btn-outline-secondary order-0 order-md-3 ms-auto me-2"}
					name="dark_mode"
					tabIndex={1}
					onClick={() => {
						const newTheme = theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;

						setTheme(newTheme);
						logClick("toggle_theme", { to: newTheme });
					}}
				/>
				{user && !user.isAnonymous && <Link
					href="/account/profile"
					prefetch={false}
					passHref
					role="button"
					className="btn btn-outline-secondary d-flex flex-row gap-1 align-items-center order-1 order-md-4 me-2 me-md-0"
					aria-label="profile">

					<Icon size="md" name="account_circle" />

				</Link>}
				{(!user || user.isAnonymous) && <Button
					className={mergeNames(styles.authStateBtn, "order-1 order-md-4 me-2 me-md-0")}
					variant="outline-secondary"
					state={authReady ? "none" : "loading"}
					left={<Icon size="md" name="login" />}
					onClick={() => setSignIn(true)}
					disabled={!authReady}
				/>}
			</Container>
		</Navbar>
		<SignInDialog show={showSignIn} onHide={() => setSignIn(false)} />
		<RouteIndicator />
	</>;
};

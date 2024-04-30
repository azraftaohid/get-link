import { getAuth, signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";
import Nav from "react-bootstrap/Nav";
import NavItem from "react-bootstrap/NavItem";
import { mergeNames } from "../../utils/mergeNames";
import { useToast } from "../../utils/useToast";
import { Button } from "../Button";

const navs: { title: string, pathname: string }[] = [
	{
		title: "Profile",
		pathname: "/account/profile",
	},
	{
		title: "Security",
		pathname: "/account/security",
	},
];

export const AccountNavigation: React.FunctionComponent<AccountNavigationProps> = ({
	className,
	...rest
}) => {
	const router = useRouter();
	const { makeToast } = useToast();

	return (
        <div className={mergeNames("d-flex flex-row flex-md-column w-md-25 overflow-x-scroll overflow-x-md-auto", className)} {...rest}>
            <Nav className={"flex-nowrap flex-md-column"} variant={"pills"}>
                {navs.map((nav, i) => <NavItem key={nav.pathname} className={mergeNames(i !== navs.length - 1 && "mb-md-2")}>
                    <Link className={mergeNames("nav-link", router.pathname === nav.pathname && "active")} href={nav.pathname}>
                        {nav.title}
                    </Link>
                </NavItem>)}
            </Nav>
            <hr className={"d-none d-md-block"} />
            <div className={"vr mx-3 d-md-none"} />
            <Button
                className={"text-nowrap w-md-100"}
                variant={"outline-danger"}
                onClick={async () => {
                    try {
                        await signOut(getAuth());
                        makeToast("Signed out", "info");
                    } catch (error) {
                        console.error("Error signing out: ", error);
                        makeToast("Unable to sign out", "error");
                    }
                }}
            >
                Sign out
            </Button>
        </div>
    );
};

export interface AccountNavigationProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {

}

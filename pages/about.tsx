import { NextPage } from "next";
import Image from "next/image";
import React from "react";
import Figure from "react-bootstrap/Figure";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Link } from "../components/Link";
import { Metadata } from "../components/Meta";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";
import { Standout } from "../components/Standout";

const Section: React.FunctionComponent<{ noSep?: boolean }> = ({ noSep, children }) => {
	return <>
		{children}
		{!noSep && <hr className="my-5" />}
	</>;
};

const Lead: React.FunctionComponent<React.AllHTMLAttributes<HTMLElement>> = ({ children, ...rest }) => {
	return <h3 className="mb-3" {...rest}>
		{children}
	</h3>;
};

const Proposition: React.FunctionComponent<React.AllHTMLAttributes<HTMLElement>> = ({ children, ...rest }) => {
	return <div className="fs-5" {...rest}>
		{children}
	</div>;
};

const QAndA: React.FunctionComponent<{ question: React.ReactNode, answer: React.ReactNode }> = ({ question, answer }) => {
	return <>
		<h4 className="mt-5 mb-3">{question}</h4>
		<div className="fs-5">{answer}</div>
	</>;
};

const About: NextPage = () => {
	return <PageContainer>
		<Metadata 
			title="About - Get Link"
			image="/dark_flow.svg"
		/>
		<Header />
		<PageContent>
			<Figure className="text-center w-100">
				<blockquote className="fs-3">Just get me a <span className="text-muted">link</span>!</blockquote>
				<Figure.Caption className="blockquote-footer fs-6">
					Someone over frustration of <cite title="Messenger is an instant messaging app and platform developed by Facebook.">
						Messenger</cite> compression.
				</Figure.Caption>
			</Figure>
			<Section>
				<Proposition>
					Get-Link is a truely one-tap solution that let&apos;s you create links for files on the internet. It&apos;s 
					fast, light-weight, easy to use &mdash; just gets the thing done; nothing else.
				</Proposition>
				<div className="d-flex justify-content-center w-100 my-4">
					<Image 
						className="border border-secondary"
						src="/dark_flow.svg"
						alt="A flow chart explaining how Get-Link works"
						width={640}
						height={480}
					/>
				</div>
			</Section>
			<Section>
				<Lead>Original quality</Lead>
				<Proposition>
					Photos along with any other types of files are shared without any level of compressions. Meaning, when 
					shared, viewers will be able to see the exact copy of the file you orginally uploaded. This is one of the 
					main motives behind this project.
				</Proposition>
			</Section>
			<Section>
				<Lead>Security</Lead>
				<Proposition>
					By default, links are generated with random, and ungussable characters &mdash; making it extremly hard for 
					unintended users to find your files.
				</Proposition>
			</Section>
			<Section noSep>
				<Lead>Frequently asked questions</Lead>
				<Proposition>
					While Get-Link is built in a way enabling anyone to start using it, we prepared answers to some{" "}
					<abbr title="Frequently Asked Questions">FAQs</abbr>.
				</Proposition>
				<QAndA 
					question="Is Get-Link free?" 
					answer="Yes, and there will always be a version of it that is completely free." />
				<QAndA 
					question="Will the links ever expire?"
					answer={<>Get-Link is meant to be a share &amp; forget type of solution. It automatically deletes any file 
						not less than 14 days old. For longer and persistable storage, consider <Link href="https://onedrive.live.com/" newTab>
							OneDrive</Link>, <Link href="https://drive.google.com" newTab>Google Drive</Link> or find one from a quick 
							Google <Link href="https://tinyurl.com/353c3j97" newTab>search</Link>.</>}
				/>
				<QAndA 
					question="What type of files are supported?"
					answer={<>
						The list of file formats that are supported include:
						<Standout>
							image, video, audio, text, pdf, xml, json, ms-excel, ms-word, ms-powerpoint and its template files, and rtf.
						</Standout>
						Note that executable file formats, including macro-enabled Office files are not supported yet but we are planning on 
						expanding this list soon.
					</>}
				/>
			</Section>
		</PageContent>
		<Footer />
	</PageContainer>;
};

export default About;
import { NextPage } from "next";
import Image from "next/image";
import React, { useState } from "react";
import Figure from "react-bootstrap/Figure";
import { Conditional } from "../components/Conditional";
import { ExpandButton } from "../components/ExpandButton";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { Link } from "../components/Link";
import { Metadata } from "../components/Meta";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";
import { Standout } from "../components/Standout";

const Section: React.FunctionComponent<React.PropsWithChildren<{ noSep?: boolean }>> = ({ noSep, children }) => {
	return (
		<>
			{children}
			{!noSep && <hr className="my-5" />}
		</>
	);
};

const Lead: React.FunctionComponent<React.PropsWithChildren<React.AllHTMLAttributes<HTMLElement>>> = ({
	children,
	...rest
}) => {
	return (
		<h3 className="mb-3" {...rest}>
			{children}
		</h3>
	);
};

const Proposition: React.FunctionComponent<React.PropsWithChildren<React.AllHTMLAttributes<HTMLElement>>> = ({
	children,
	...rest
}) => {
	return <div {...rest}>{children}</div>;
};

const QAndA: React.FunctionComponent<
	React.PropsWithChildren<{ question: React.ReactNode; answer: React.ReactNode }>
> = ({ question, answer }) => {
	return (
		<>
			<h4 className="mt-5 mb-3">{question}</h4>
			<div>{answer}</div>
		</>
	);
};

const About: NextPage = () => {
	const [faqExpanded, setFaqExpanded] = useState(false);

	return (
		<PageContainer>
			<Metadata title="About - Get Link" image="https://getlink.vercel.app/image/dark_flow.svg" />
			<Header />
			<PageContent size="lg">
				<Figure className="text-center w-100">
					<blockquote className="fs-3">
						Just get me a <span className="text-muted">link</span>!
					</blockquote>
					<Figure.Caption className="blockquote-footer fs-6">
						Someone over frustration of{" "}
						<cite title="Messenger is an instant messaging app and platform developed by Facebook.">
							Messenger
						</cite>{" "}
						compression.
					</Figure.Caption>
				</Figure>
				<Section>
					<Proposition>
						Get-Link is a truly one-tap solution that lets you create shareable links for files on the
						internet. It&apos;s fast, light-weight, easy to use&nbsp;&mdash;&nbsp;just gets the thing done;
						nothing else.
					</Proposition>
					<div className="d-flex justify-content-center w-100 my-4">
						<Image
							className="border border-secondary"
							src="/image/dark_flow.svg"
							alt="A flow chart explaining how Get-Link works"
							width={640}
							height={480}
						/>
					</div>
				</Section>
				<Section>
					<Lead>Original quality</Lead>
					<Proposition>
						Photos along with any other types of files are shared without any level of compressions.
						Meaning, when shared, viewers will be able to see the exact copy of the file you originally
						uploaded. This is one of the main motives behind this project.
					</Proposition>
				</Section>
				<Section>
					<Lead>Security</Lead>
					<Proposition>
						By default, links are generated with random, and unguessable characters &mdash; making it
						extremely hard for unintended users to find your files.
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
						answer="Yes, and there will always be a version of it that is completely free."
					/>
					<QAndA
						question="Will the links ever expire?"
						answer={
							<>
								Get-Link is designed to be a share &amp; forget type of solution. It eventually deletes
								any file older than 14 days. For longer and persistable storage, consider{" "}
								<Link href="https://onedrive.live.com/" newTab>
									OneDrive
								</Link>
								,{" "}
								<Link href="https://drive.google.com" newTab>
									Google Drive
								</Link>
								, or find one from a quick Google{" "}
								<Link href="https://tinyurl.com/353c3j97" newTab>
									search
								</Link>
								.
							</>
						}
					/>
					<QAndA
						question="Are there any file size limits?"
						answer={
							<>
								Yes, currently, files up to 95 MB can be uploaded. However, we plan to introduce a paid plan with 
								higher limits.
							</>
						}
					/>
					<QAndA
						question="What type of files are supported?"
						answer={
							<>
								Essentially any type of file is supported by Get Link. However, most of the common format of the 
								following type of files are available for previews:
								<Standout>
									image, video, audio, text, pdf, markup/code.
								</Standout>
								We are planning on expanding this list soon.
							</>
						}
					/>
					<Conditional in={faqExpanded}>
						<QAndA
							question="Can I delete a file after I have uploaded it?"
							answer={
								<>
									Currently, deleting a file requires deleting its corresponding link. Simply open the shared link 
									using the same browser or account used to create it and click &quot;Delete&quot;.
								</>
							}
						/>
						<QAndA
							question="Can I password-protect my shared links?"
							answer="No, password protection is not currently available on our site, but we are planning to introduce this feature in the future."
						/>
						<QAndA
							question="Is there a limit to the number of times a file can be downloaded?"
							answer="No, there is currently no hard limit on the number of times a file can be downloaded."
						/>
						<QAndA
							question="Can I track the number of downloads?"
							answer="No, download tracking is not currently available on our site, but we are planning to introduce this feature in the future."
						/>
						<QAndA
							question="What should I do if I loss the link to my uploaded file?"
							answer={
								<>
									Don&apos;t worry, you can find a list of your shared links on your dashboard. Simply
									navigate to your <Link href="/dashboard">dashboard</Link> and click on the link to reshare.
								</>
							}
						/>
						<QAndA
							question="Is there a limit to the number of files I can upload?"
							answer={
								<>
									No, there is currently no hard limit on the number of files you can upload to our site. However, 
									there is a limit on storage usage. Check the usage quotas available on the{" "}
									<Link href="/">home</Link> page for more details.
								</>
							}
						/>
						<QAndA
							question="Can I edit a link after creation?"
							answer="No, editing links is not currently possible on our website."
						/>
						<QAndA
							question="How is storage usage calculated"
							answer={
								<>
									Storage usage is calculated by adding up the sizes of all uploaded and/or generated files. Generated 
									files include thumbnails of certain file type, e.g., videos. Our system considers 1 KB to be 1024 bytes.
								</>
							}
						/>
						<QAndA
							question="Do you offer customer support for technical issues?"
							answer={
								<>
									Yes, you can use the <i>Feedback</i> button at the bottom of the page to reach us with any
									technical issues or questions you may have.
								</>
							}
						/>
					</Conditional>
					<ExpandButton
						className="mt-4"
						onClick={() => setFaqExpanded(c => !c)}
						right={<Icon name={faqExpanded ? "expand_less" : "expand_more"} />}
					>
						Show {faqExpanded ? "less" : "more"}
					</ExpandButton>
				</Section>
			</PageContent>
			<Footer />
		</PageContainer>
	);
};

export default About;

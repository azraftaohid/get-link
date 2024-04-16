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
					<Lead>Experience True Quality</Lead>
					<Proposition>
						Say goodbye to file compression woes! With Get-Link, your photos and files are shared in their 
						original, pristine quality. Whether it&apos;s high-resolution images or important documents, 
						rest assured that your recipients will receive an exact copy of what you uploaded. We&apos;re 
						committed to preserving the integrity of your files, making us the go-to choice for those who 
						demand the best.
					</Proposition>
				</Section>
				<Section>
					<Lead>Seamless Security</Lead>
					<Proposition>
						Your privacy is our top priority. We don&apos;t peek, poke, or prod. On top, Get-Link generates 
						links with random, unguessable characters by default, ensuring that only intended recipients have 
						access to your files. Our robust security measures make it virtually impossible for unauthorized 
						users to intercept or access your sensitive data. Share with confidence, knowing that your files 
						are safe and secure.
					</Proposition>
				</Section>
				<Section>
					<Lead>Lightning-fast and Intuitive</Lead>
					<Proposition>
						Get-Link is designed for speed and simplicity. With just a few taps, you can effortlessly create 
						shareable links for your files. Our user-friendly interface makes the process quick and intuitive
						&nbsp;&mdash;&nbsp;no unnecessary steps or complications. Get in, get your link, and get on with 
						your day. It&apos;s that easy.
					</Proposition>
				</Section>
				<Section>
					<Lead>Accessibility</Lead>
					<Proposition>
						With Get-Link, there&apos;s no need to download or install any additional apps. Our web-based 
						platform ensures seamless access from most devices with an internet connection. Whether you&apos;re 
						on a smartphone, tablet, laptop, or desktop computer, you can create and share links with ease.
					</Proposition>
				</Section>
				<Section noSep>
					<Lead>Frequently Asked Questions</Lead>
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
								Essentially any type of file is supported by Get-Link. However, most of the common format of the 
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

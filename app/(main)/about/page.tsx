import { Image } from "@/components/Image";
import Link from "@/components/Link";
import { Standout } from "@/components/Standout";
import { Metadata } from "next";
import Figure from "react-bootstrap/Figure";
import FigureCaption from "react-bootstrap/FigureCaption";
import ExpandableFAQ from "./ExpandableFAQ";
import { Lead, Proposition, QAndA, Section } from "./helperComponents";

export const dynamic = "force-static";

export const metadata: Metadata = {
	title: "About",
	openGraph: {
		images: "/image/dark_flow.jpg",
	},
	twitter: {
		card: "summary_large_image",
		images: "/image/dark_flow.jpg",
	}
};

export default function Page() {
	return <>
		<Figure className="text-center w-100">
			<blockquote className="fs-3">
				Just get me a <span className="text-muted">link</span>!
			</blockquote>
			<FigureCaption className="blockquote-footer fs-6">
				Someone over frustration of{" "}
				<cite title="Messenger is an instant messaging app and platform developed by Facebook.">
					Messenger
				</cite>{" "}
				compression.
			</FigureCaption>
		</Figure>
		<Section>
			<Proposition>
				Get-Link is a truly one-tap solution that lets you create shareable links for files on the
				internet. It&apos;s fast, light-weight, easy to use&nbsp;&mdash;&nbsp;just gets the thing done;
				nothing else.
			</Proposition>
			<div className="d-flex justify-content-center w-100 my-4">
				<Image
					className="border border-secondary fit-contain mw-100 h-100"
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
						Get-Link is designed to be a share &amp; forget type of solution. By default, links are deleted 
						after 14 days on an eventual basis. For persistent storage, consider{" "}
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
			<ExpandableFAQ />
		</Section>
	</>;
}

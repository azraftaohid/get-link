import Link from "@/components/Link";
import { DOMAIN } from "@/utils/urls";
import { Metadata } from "next";
import Alert from "react-bootstrap/Alert";
import { Heading, Lead, Proposition, Topic } from "./helperComponents";

export const metadata: Metadata = {
	title: "Policies",
	description: "Learn how we handle the data you provide us with and we collect.",
};

export default function Page() {
	return <>
		<Heading>Policies</Heading>
		<small className="text-muted">
			Last updated:{" "}
			<time itemProp="published" dateTime="2024-12-28">
				28 December, 2024
			</time>
		</small>
		<Proposition>
			Using our services by visiting or accessing this site (i.e.{" "}
			<Link variant="reset" href={DOMAIN}>
				{DOMAIN}
			</Link>{" "}
			and its canonical addresses) you consent to these{" "}
			<Link variant="reset" href="/policies#tos">
				Terms of Service
			</Link>{" "}
			and{" "}
			<Link variant="reset" href="/policies#privacy-policy">
				Privacy Policy
			</Link>
			. If you do not consent, do not use our services. Failure to comply may get you banned and/or your
			content deleted.
		</Proposition>
		<Alert className="mt-4" variant="info">
			If you have any queries, confusion, or complaints, please use the <i>Feedback</i> button at the
			bottom of the page to reach us.
		</Alert>
		<hr />
		<Proposition>
			<abbr title="Too long; didn't read">Tl;dr</abbr>: you will not upload content that promotes
			misinformation, hate speech, violence, or is considered illegal including nonconsensual and/or child
			porn. You will also not upload content that doesn&apos;t qualify for{" "}
			<Link href="https://copyrightalliance.org/faqs/what-is-fair-use" newTab>
				fair use
			</Link>{" "}
			without obtaining the copyright holder&apos;s permission. <br />
			And we will only collect personal information that you provide us with. We will not share any
			information without your consent with third parties that may be used to uniquely identify you.<br />
			We offer paid services, but do not guarantee refunds. However, when you switch plans, we may offer discounts.
		</Proposition>
		<hr />
		<Topic id="introduction">Introduction</Topic>
		<Proposition>
			Throughout this policy, URLs like <Link variant="reset" href="/upgrade">/upgrade</Link> are relative URLs, 
			meaning they should be accessed by appending them to the base URL <Link variant="reset" href={DOMAIN}>
			{DOMAIN}</Link>. For example, the full URL for <Link variant="reset" href="/upgrade">/upgrade</Link> is{" "}
			<Link variant="reset" href={"/upgrade"}>{DOMAIN + "/upgrade"}</Link>.
		</Proposition>
		<Topic id="tos">Terms of Service</Topic>
		<Proposition>
			Before using this website (the Service) provided by Get Link (Us), be sure to read and understand
			what you can and cannot do.
		</Proposition>
		<Lead id="whats-prohibited">What&apos;s prohibited</Lead>
		<Proposition>
			When using our services (i.e. uploading, accessing, deleting any files or content from and to our
			system) you ensure that you are not violating any of these rules:
			<ol>
				<li>
					You cannot spread misinformation, hate speech, or anything that may be illegal or encourage
					violence.
				</li>
				<li>
					You cannot upload content that you don&apos;t hold copyright rights to and that does not
					qualify for fair use without the appropriate owner&apos;s permission.
				</li>
				<li>You cannot upload content that points to Get Link mimicking sites.</li>
				<li>You cannot do or attempt to do avoid any usage quotas imposed by Get Link.</li>
				<li>You cannot use Get Link for commercial usage unless otherwise stated by us.</li>
			</ol>
		</Proposition>
		<Lead id="whats-allowed">What&apos;s allowed</Lead>
		<Proposition>
			Get Link is meant to be a simple, and quick way to share files with anyone who has access to the
			internet with a modern web browser. As long as you use this service for the intended purpose, you
			are most likely fine. Followings are the specifics that you, a viewer, can do:
			<ol>
				<li>You may use user shared content for personal or non-commercial purposes.</li>
				<li>
					You may use user shared content for anything that qualifies for fair use under copyright
					law.
				</li>
				<li>
					If you find something on our site that may be inappropriate, please report to us using the{" "}
					<i>Feedback</i> button from the bottom of the page.
				</li>
			</ol>
			Note: sharers may extend permissions stated above for content shared by themself.
		</Proposition>
		<Lead id="disclaimer">Disclaimer</Lead>
		<Proposition className="text-uppercase">
			Get Link&apos;s services are provided on an AS IS - WITH ALL FAULTS basis. We make no warranties of
			non-infringement, and you use this service at your own risk. We will not be liable for any kind of
			damages arising out of your use of or inability to use of Get Link&apos;s services. We serve no duty
			to monitor any content on this site and provide no guarantee of the accuracy, appropriateness,
			availability of the content uploaded or appearing on our site.
		</Proposition>
		<Topic id="privacy-policy">Privacy Policy</Topic>
		<Proposition>
			When you use our services (e.g. by visiting{" "}
			<Link href={DOMAIN} newTab>
				{DOMAIN}
			</Link>
			) we store the information you provide us as well as some that are collected automatically. In the
			following sections, we will try our best to describe what specific information we collect, how we
			use it, and how long do we store it. Please bear with us.
		</Proposition>
		<Lead id="information-we-collect">Information we collect</Lead>
		<Proposition>
			We collect information and data that you provide to us willingly. That includes a) any files you
			upload through the Home page of Get Link, b) any information you provide in our <i>Feedback</i> form
			including your name, email address, and a brief statement using the <i>Feedback</i> button from the
			bottom of the page.
		</Proposition>
		<Proposition>
			We also collect a little information automatically when you use our services. That may include a)
			your IP address, b) browser characteristics (i.e. name, mobile or desktop etc.), c) core web vitals,
			d) cookies, and other technical information.
		</Proposition>
		<Lead id="usage-of-information">Usage of information</Lead>
		<Proposition>
			We use the information we collect to serve users with the right content, improve our products, and
			maintain the security of our services. We may store this data in an aggregated stage and use it for
			analytical purposes. We do not share or sell any of our users&apos; personal information with third
			parties without their consent.
		</Proposition>
		<Proposition>
			The files you upload from the Home page of Get Link are uploaded anonymously. They are only shared
			with people you share the links with.
		</Proposition>
		<Lead id="cookie">Cookies</Lead>
		<Proposition>
			We may collect and store cookies on this site for analytical purposes. We use:
			<ul>
				<li>Vercel Analytics</li>
				<li>Google Analytics</li>
			</ul>
			These services may also collect, store and transfer technical information about you including your
			IP address, device characteristics, the browser you used to visit, and others.
		</Proposition>
		<Lead id="duration-of-storage">Duration of Storage</Lead>
		<Proposition>
			Information is stored longer depending on its context and purposes. That is, when you provide e
			feedback to us, we may store the content of the <i>statement</i> field and IP address used to make
			such feedback for a long time, whilst if contact information is provided, we may delete this
			information no less than 90 days after they are deemed useless.
		</Proposition>
		<Proposition>
			However, the files you upload may be deleted not less than 14 days after they are uploaded or before the expiration 
			date you specify during upload.
		</Proposition>
		<Topic id="refund-policy">Refund Policy</Topic>
		<Proposition>
			Get Link offers paid subscription-based services. Please read this policy carefully to understand our refund terms.
		</Proposition>
		<Lead id="no-refunds">No Refunds</Lead>
		<Proposition>
			We do not guarantee refunds for any payments made on our platform. All purchases are considered final.
		</Proposition>
		<Lead id="switching-plans">Switching plans</Lead>
		<Proposition>
			If you switch between subscription plans using the Upgrade page (<Link href="/upgrade" newTab>/upgrade</Link>), any 
			active subscription may be <em>traded in</em> automatically to adjust the cost of the new plan. Here&apos;s how it works:
			<ul>
				<li>
					<strong>Trade-in:</strong> An active subscription is traded in when switching plans. If multiple active 
					subscriptions exist, one may be selected at our discretion for trade-in.
				</li>
				<li>
					<strong>No active subscriptions:</strong> If you have no active subscriptions, no trade-in will occur, 
					and the full price of the new plan will apply. You can manage or disable subscriptions via the <i>Billing</i>{" "}
					section at account settings (<Link href="/account/billing" newTab>/account/billing</Link>).
				</li>
				<li>
					<strong>Discounts:</strong> Any discounts resulting from a trade-in will be applied automatically at checkout.
				</li>
			</ul>
		</Proposition>
		<Alert className="mt-4" variant="info">
			<b>Please note:</b> switching plans is different from purchasing a new subscription and may involve trading in an 
			existing active subscription. Ensure you review your plan details before making changes.
		</Alert>
	</>;
}

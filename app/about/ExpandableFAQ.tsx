"use client";

import { Conditional } from "@/components/Conditional";
import { ExpandButton } from "@/components/ExpandButton";
import { Icon } from "@/components/Icon";
import Link from "@/components/Link";
import { useState } from "react";
import { QAndA } from "./helperComponents";

export default function ExpandableFAQ () {
	const [faqExpanded, setFaqExpanded] = useState(false);

	return <>
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
	</>;
}

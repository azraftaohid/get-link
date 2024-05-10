import { PageContent } from "@/components/PageContent";
import { AccountNavigation } from "@/components/accounts/AccountNavigation";
import { AccountSettings } from "@/components/accounts/AccountSettings";
import { AccountSettingsContainer } from "@/components/accounts/AccountSettingsContainer";
import { WithChildren } from "@/utils/children";

export default function AccountSettingsLayout({ children }: WithChildren) {
	return <PageContent>
		<AccountSettingsContainer>
			<AccountNavigation />
			<AccountSettings>
				{children}
			</AccountSettings>
		</AccountSettingsContainer>
	</PageContent>;
}

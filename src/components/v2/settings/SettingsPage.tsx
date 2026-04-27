"use client";

import * as React from "react";

import { Page, PageBody, PageHeader } from "../layout";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { AccountTab } from "./AccountTab";
import { TeamTab } from "./TeamTab";

export type SettingsTab = "account" | "team";

interface SettingsPageProps {
  /** Which tab to land on. Set from the sidebar dropdown that opened the page. */
  initialTab?: SettingsTab;
  /** Active org context — required by the Team tab. */
  orgId: string | null;
  orgName: string;
  /**
   * Called when the user closes settings (e.g. clicks "Back to chat" or
   * dismisses the panel). Mirrors the old AccountPanel/TeamPanel API.
   */
  onClose: () => void;
}

/**
 * Settings — Account + Team tabs in a single page. Replaces the legacy
 * AccountPanel and TeamPanel components. Layout matches the design's
 * settings.html: PageHeader breadcrumb + underline-style Tabs, narrow
 * (880px) body, sections of card-grouped FieldRows.
 */
export default function SettingsPage({
  initialTab = "account",
  orgId,
  orgName,
  onClose,
}: SettingsPageProps) {
  const [tab, setTab] = React.useState<SettingsTab>(initialTab);

  // Keep tab in sync if the host changes initialTab (e.g. user picks a
  // different option from the account dropdown without closing first).
  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <Page className="meaning-v2">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as SettingsTab)}
        className="flex h-full min-h-0 w-full flex-col"
      >
        <PageHeader
          breadcrumb={["Settings", tab === "account" ? "Account" : "Team"]}
          tabs={
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>
          }
        />
        <PageBody contained="narrow" padding="default">
          <TabsContent
            value="account"
            className="mt-0 focus-visible:outline-none focus-visible:ring-0"
          >
            <AccountTab onClose={onClose} />
          </TabsContent>
          <TabsContent
            value="team"
            className="mt-0 focus-visible:outline-none focus-visible:ring-0"
          >
            <TeamTab orgId={orgId} orgName={orgName} onClose={onClose} />
          </TabsContent>
        </PageBody>
      </Tabs>
    </Page>
  );
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getValidMicrosoftAdsTokenForUser } from "@/lib/microsoft-ads-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/microsoft-ads/accessible-accounts
 *
 * Lists Microsoft Ads accounts accessible to the authenticated user.
 * Uses the Customer Management API: GetUser → extract CustomerIds from
 * CustomerRoles → GetAccountsInfo for each customer.
 */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const accessToken = await getValidMicrosoftAdsTokenForUser(userId);
  if (!accessToken) {
    return NextResponse.json(
      { error: "No Microsoft Ads token. Please connect your account first." },
      { status: 400 }
    );
  }

  const developerToken = process.env.MICROSOFT_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    return NextResponse.json(
      { error: "Missing MICROSOFT_ADS_DEVELOPER_TOKEN" },
      { status: 500 }
    );
  }

  const soapHeaders = `
          <AuthenticationToken xmlns="https://bingads.microsoft.com/Customer/v13">${accessToken}</AuthenticationToken>
          <DeveloperToken xmlns="https://bingads.microsoft.com/Customer/v13">${developerToken}</DeveloperToken>`;

  const soapUrl = "https://clientcenter.api.bingads.microsoft.com/Api/CustomerManagement/v13/CustomerManagementService.svc";

  try {
    // Step 1: GetUser to get CustomerRoles (lists all customer IDs the user can access)
    const getUserBody = `
      <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
        <s:Header>${soapHeaders}</s:Header>
        <s:Body>
          <GetUserRequest xmlns="https://bingads.microsoft.com/Customer/v13">
            <UserId xmlns:i="http://www.w3.org/2001/XMLSchema-instance" i:nil="true"/>
          </GetUserRequest>
        </s:Body>
      </s:Envelope>`;

    const getUserRes = await fetch(soapUrl, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "GetUser" },
      body: getUserBody,
    });

    const getUserText = await getUserRes.text();

    if (!getUserRes.ok) {
      console.error("[microsoft-ads] GetUser failed:", getUserRes.status, getUserText.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to get Microsoft Ads user info", detail: getUserText.slice(0, 200) },
        { status: 502 }
      );
    }

    // Extract all unique CustomerIds from CustomerRoles
    const customerIdMatches = getUserText.match(/<a:CustomerId>(\d+)<\/a:CustomerId>/g) || [];
    const customerIds = [...new Set(
      customerIdMatches.map((m) => {
        const match = m.match(/(\d+)/);
        return match ? match[1] : null;
      }).filter(Boolean) as string[]
    )];

    console.log("[microsoft-ads] Found customer IDs from GetUser:", customerIds);

    if (customerIds.length === 0) {
      return NextResponse.json({ accounts: [] });
    }

    // Step 2: GetAccountsInfo for each customer ID to get the ad accounts
    const accounts: Array<{ accountId: string; accountName: string; customerId: string; accountNumber: string }> = [];

    for (const customerId of customerIds) {
      const getAccountsBody = `
        <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
          <s:Header>${soapHeaders}
            <CustomerId xmlns="https://bingads.microsoft.com/Customer/v13">${customerId}</CustomerId>
          </s:Header>
          <s:Body>
            <GetAccountsInfoRequest xmlns="https://bingads.microsoft.com/Customer/v13">
              <CustomerId>${customerId}</CustomerId>
              <OnlyParentAccounts>false</OnlyParentAccounts>
            </GetAccountsInfoRequest>
          </s:Body>
        </s:Envelope>`;

      const accountsRes = await fetch(soapUrl, {
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "GetAccountsInfo" },
        body: getAccountsBody,
      });

      const accountsText = await accountsRes.text();
      console.log("[microsoft-ads] GetAccountsInfo response for customer", customerId, ":", accountsText.slice(0, 2000));

      if (!accountsRes.ok) {
        console.warn("[microsoft-ads] GetAccountsInfo failed for customer", customerId);
        continue;
      }

      // Parse AccountInfo blocks
      const infoBlocks = accountsText.split("<a:AccountInfo>");
      for (let i = 1; i < infoBlocks.length; i++) {
        const block = infoBlocks[i];
        const idMatch = block.match(/<a:Id>(\d+)<\/a:Id>/);
        const nameMatch = block.match(/<a:Name>([^<]*)<\/a:Name>/);
        const numberMatch = block.match(/<a:Number>([^<]*)<\/a:Number>/);
        const statusMatch = block.match(/<a:AccountLifeCycleStatus>([^<]*)<\/a:AccountLifeCycleStatus>/);

        if (idMatch) {
          // Only include active/paused accounts, not deleted
          const status = statusMatch?.[1] ?? "";
          if (status === "Draft" || status === "Inactive") continue;

          accounts.push({
            accountId: idMatch[1],
            accountName: nameMatch?.[1] ?? `Account ${idMatch[1]}`,
            customerId,
            accountNumber: numberMatch?.[1] ?? "",
          });
        }
      }
    }

    return NextResponse.json({ accounts });
  } catch (err) {
    console.error("[microsoft-ads] Error fetching accounts:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

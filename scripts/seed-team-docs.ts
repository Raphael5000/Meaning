/**
 * Seeds 5 Teams documentation articles into the database.
 *
 * Usage: npx tsx scripts/seed-team-docs.ts
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Article content                                                    */
/* ------------------------------------------------------------------ */

const articles = [
  /* ================================================================ */
  /*  1. Teams Overview                                                */
  /* ================================================================ */
  {
    slug: "teams-overview",
    title: "Teams Overview",
    description:
      "Collaborate with your team — share data sources, dashboards, and insights in one workspace.",
    section: "docs",
    category: "teams",
    type: "article",
    readTime: "2 min read",
    featured: true,
    keywords: [
      "teams",
      "overview",
      "collaboration",
      "workspace",
      "organisation",
      "roles",
    ],
    content: `---
---

Teams (organisations) are shared workspaces where everyone can access the same data. Create a team, connect your platforms, invite your colleagues, and start collaborating — no per-person setup required.

<DocsDemo type="teams-overview" />

## Why Teams?

- **Share connected data sources** with your entire team
- **Everyone sees data in the same currency** — no inconsistencies between team members
- **Dashboards, chats, and alerts are scoped to the team** — everything stays in one place
- **No need to connect each platform per person** — connect once, everyone queries

## Roles

- **Owner**: The person who created the team. Can invite and remove members, manage connections, and configure team settings
- **Member**: Can query all connected data, create dashboards, set up alerts, and use AI chat. Cannot manage members or team settings

## How It Works

1. Create a team and connect your data sources
2. Invite team members by email
3. Everyone can immediately start asking questions and building dashboards
4. All data, dashboards, and chats are shared within the team
`,
  },

  /* ================================================================ */
  /*  2. Creating a Team                                               */
  /* ================================================================ */
  {
    slug: "creating-team",
    title: "Creating a Team",
    description: "Create a new team workspace in seconds.",
    section: "docs",
    category: "teams",
    type: "guide",
    readTime: "1 min read",
    featured: false,
    keywords: [
      "teams",
      "create",
      "new team",
      "workspace",
      "account",
      "setup",
    ],
    content: `---
---

## Steps

1. Click the **account selector** in the top-left corner of the sidebar
2. Click **New account**
3. Enter a name for your team (e.g. your company or client name)
4. Click **Create**

## What Happens Next

- You become the team owner and admin
- The team is set as your active workspace
- Display currency defaults to USD (changeable in Connections)
- You can now connect data sources and invite members

## Multiple Teams

- You can create and belong to multiple teams
- Switch between teams using the account selector dropdown
- Each team has its own data sources, dashboards, chats, and alerts
- Great for agencies managing multiple clients
`,
  },

  /* ================================================================ */
  /*  3. Inviting Members                                              */
  /* ================================================================ */
  {
    slug: "inviting-members",
    title: "Inviting Members",
    description:
      "Add team members by email — they get instant access to all connected data.",
    section: "docs",
    category: "teams",
    type: "guide",
    readTime: "2 min read",
    featured: false,
    keywords: [
      "teams",
      "invite",
      "members",
      "email",
      "collaboration",
      "access",
    ],
    content: `---
---

<DocsDemo type="team-invite" />

## Sending an Invite

1. Click **Team** in the account menu (bottom of sidebar)
2. Enter the person's email address
3. Click **Invite**
4. They receive an email with a link to join

## What Invitees Get

- Access to all connected data sources in the team
- Ability to query data via AI chat
- Create and edit dashboards
- Set up email alerts
- View all team chats and dashboards

## Invite Details

- Invites expire after **7 days**
- If the person doesn't have a Meaning account, they'll create one when accepting
- If they already have an account, they'll be added to the team on login
- You can resend expired invites from the Team panel

## Pending Invites

- The Team panel shows all pending invites with their expiration date
- Cancel pending invites if sent to the wrong email
`,
  },

  /* ================================================================ */
  /*  4. Connecting Data Sources                                       */
  /* ================================================================ */
  {
    slug: "connecting-data-sources",
    title: "Connecting Data Sources to Your Team",
    description:
      "Add analytics platforms to your team so all members can query the data.",
    section: "docs",
    category: "teams",
    type: "guide",
    readTime: "2 min read",
    featured: false,
    keywords: [
      "teams",
      "connect",
      "data sources",
      "platforms",
      "OAuth",
      "currency",
    ],
    content: `---
---

## How It Works

- Data sources are connected at the team level, not per user
- Once connected, every team member can query that data source
- No need for each person to authenticate separately

## Connecting a Platform

1. Make sure you've selected the right team in the account selector
2. Open **Connections** from the account menu
3. Click **Connect** next to the platform you want to add
4. Authenticate with the platform (OAuth)
5. Select the specific account/property
6. Click **Enable** — data syncs automatically

## Supported Platforms

- Google Analytics 4
- Google Ads
- Microsoft Ads
- LinkedIn Company Pages
- Mailchimp
- Google Search Console

## Display Currency

- Set your team's display currency in the Connections panel
- All monetary values (ad spend, revenue) are converted to this currency
- All team members see data in the same currency
- Supported currencies: USD, EUR, GBP, ZAR, AUD, CAD, JPY, and more

## Notes

- Only the team owner can connect and disconnect data sources
- Data syncs automatically every day
- Historical data is backfilled on first connection
- Disconnecting a data source removes it for all team members
`,
  },

  /* ================================================================ */
  /*  5. Managing Your Team                                            */
  /* ================================================================ */
  {
    slug: "managing-team",
    title: "Managing Your Team",
    description:
      "Switch teams, remove members, update settings, and understand permissions.",
    section: "docs",
    category: "teams",
    type: "guide",
    readTime: "2 min read",
    featured: false,
    keywords: [
      "teams",
      "manage",
      "permissions",
      "roles",
      "billing",
      "settings",
      "remove",
    ],
    content: `---
---

## Switching Teams

- Click the account selector in the top-left sidebar
- Select the team you want to work in
- All data, dashboards, and chats switch to that team's context
- Your last active team is remembered between sessions

## Removing Members

- Open the **Team** panel from the account menu
- Click the remove button next to the member's name
- The member immediately loses access to the team's data
- They can still access other teams they belong to

## Renaming Your Team

- Open the **Team** panel
- Edit the team name at the top
- The new name appears everywhere — account selector, dashboards, alerts

## Permissions Reference

| Action | Owner | Member |
|---|---|---|
| Query data (AI chat) | Yes | Yes |
| Create dashboards | Yes | Yes |
| Create alerts | Yes | Yes |
| View all team data | Yes | Yes |
| Connect data sources | Yes | No |
| Invite members | Yes | No |
| Remove members | Yes | No |
| Change team settings | Yes | No |
| Delete team | Yes | No |

## Billing & Seats

- Your subscription includes a seat count
- Each team member uses one seat
- Upgrade your plan if you need more seats
`,
  },
];

/* ------------------------------------------------------------------ */
/*  Seed                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        description: article.description,
        section: article.section,
        category: article.category,
        type: article.type,
        readTime: article.readTime,
        featured: article.featured,
        keywords: article.keywords,
        content: article.content,
      },
      create: {
        slug: article.slug,
        title: article.title,
        description: article.description,
        section: article.section,
        category: article.category,
        type: article.type,
        readTime: article.readTime,
        featured: article.featured,
        keywords: article.keywords,
        content: article.content,
      },
    });
    console.log(`Seeded: ${article.slug}`);
  }
}

main()
  .then(() => {
    console.log("\nAll 5 Teams docs seeded successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });

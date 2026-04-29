import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user + auto-provision Organization + admin membership.
    // (Mirrors NextAuth's events.createUser for the OAuth path.)
    const firstName =
      ((name as string | null) ?? (email as string).split("@")[0])
        .split(" ")[0] || "User";
    const orgName = `${firstName}'s workspace`;

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: name || null,
          email,
          passwordHash,
        },
      });

      const org = await tx.organization.create({
        data: { name: orgName, ownerId: newUser.id },
      });
      await tx.orgMembership.create({
        data: { orgId: org.id, userId: newUser.id, role: "admin" },
      });
      await tx.user.update({
        where: { id: newUser.id },
        data: { activeOrgId: org.id },
      });

      return newUser;
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

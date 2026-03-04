import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    userId?: string;
    accessToken?: string;
    error?: string;
    teamId?: string;
    teamRole?: string;
    teamAdminId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    provider?: string;
    error?: string;
    teamId?: string;
    teamRole?: string;
    teamAdminId?: string;
  }
}

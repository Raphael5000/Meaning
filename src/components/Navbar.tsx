"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/docs") return pathname.startsWith("/docs");
  return pathname === href;
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <nav className="relative z-50 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
      {/* Logo */}
      <Link href="/" className="shrink-0">
        <Image
          src="/Logo.svg"
          alt="Meaning"
          width={120}
          height={42}
          className="h-8 w-auto sm:h-9 invert dark:invert-0"
          priority
        />
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden items-center gap-1 md:flex">
        <NavigationMenu>
          <NavigationMenuList>
            {navLinks.map((link) => (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink asChild>
                  <Link
                    href={link.href}
                    className={cn(
                      "inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:text-[var(--text-primary)]",
                      isActive(pathname, link.href)
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-secondary)]"
                    )}
                  >
                    {link.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}

            {session ? (
              <>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/"
                      className={cn(
                        "inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:text-[var(--text-primary)]",
                        pathname === "/"
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-secondary)]"
                      )}
                    >
                      Chat
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/account"
                      className={cn(
                        "inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:text-[var(--text-primary)]",
                        pathname === "/account"
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-secondary)]"
                      )}
                    >
                      Account
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    Sign out
                  </button>
                </NavigationMenuItem>
              </>
            ) : (
              <>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/login"
                      className="inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      Log in
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Button asChild className="rounded-full">
                    <Link href="/signup">Get started</Link>
                  </Button>
                </NavigationMenuItem>
              </>
            )}

            {/* Theme toggle */}
            <NavigationMenuItem>
              <button
                onClick={toggleTheme}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-tertiary)]"
                aria-label="Toggle theme"
              >
                {resolvedTheme === "dark" ? (
                  <Moon className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
                ) : (
                  <Sun className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
                )}
              </button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Mobile Hamburger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-tertiary)] md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="flex flex-col p-0">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>

          {/* Mobile header */}
          <div className="flex items-center px-6 pt-6 pb-4">
            <Link href="/" onClick={() => setOpen(false)} className="shrink-0">
              <Image
                src="/Logo.svg"
                alt="Meaning"
                width={100}
                height={36}
                className="h-7 w-auto invert dark:invert-0"
              />
            </Link>
          </div>

          {/* Mobile links */}
          <div className="flex flex-1 flex-col gap-1 px-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-4 py-3 text-base font-medium transition-colors",
                  isActive(pathname, link.href)
                    ? "bg-[rgba(16,163,127,0.1)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                )}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              {resolvedTheme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              {resolvedTheme === "dark" ? "Dark mode" : "Light mode"}
            </button>

            {session ? (
              <>
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-4 py-3 text-base font-medium transition-colors",
                    pathname === "/"
                      ? "bg-[rgba(16,163,127,0.1)] text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Chat
                </Link>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-4 py-3 text-base font-medium transition-colors",
                    pathname === "/account"
                      ? "bg-[rgba(16,163,127,0.1)] text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Account
                </Link>

                <div className="my-2 border-t border-[var(--border-color)]" />

                <button
                  onClick={() => {
                    setOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="cursor-pointer rounded-lg px-4 py-3 text-left text-base font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 text-base font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Log in
                </Link>

                <div className="my-2 border-t border-[var(--border-color)]" />

                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-6 py-3 text-center text-base font-semibold text-white transition-all"
                  style={{
                    background:
                      "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)",
                  }}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

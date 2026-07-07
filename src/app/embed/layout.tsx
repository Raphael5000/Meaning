import "../globals.css";
import "../tokens-v2.css";
import { Martel, Hanken_Grotesk, Geist_Mono } from "next/font/google";
import { EmbedThemeProvider } from "./EmbedThemeProvider";

const martel = Martel({
  subsets: ["latin"],
  weight: ["200", "300", "400"],
  variable: "--font-martel",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`meaning-v2 ${martel.variable} ${hanken.variable} ${mono.variable}`}>
      <EmbedThemeProvider>
        {children}
      </EmbedThemeProvider>
    </div>
  );
}

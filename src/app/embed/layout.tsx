import "../globals.css";
import "../tokens-v2.css";
import { Martel, Inter, JetBrains_Mono } from "next/font/google";

const martel = Martel({
  subsets: ["latin"],
  weight: ["200", "300", "400"],
  variable: "--font-martel",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
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
    <div className={`meaning-v2 ${martel.variable} ${inter.variable} ${mono.variable}`}>
      {/* Sync theme with host portal via ?theme= query param; default to light */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var t=new URLSearchParams(window.location.search).get("theme");if(t==="dark"){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}})();`,
        }}
      />
      {children}
    </div>
  );
}

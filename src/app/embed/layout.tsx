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
      {/* Sync theme with host portal: read ?theme= on load, listen for postMessage updates */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){function set(t){if(t==="dark"){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}set(new URLSearchParams(window.location.search).get("theme")||"light");window.addEventListener("message",function(e){if(e.data&&e.data.type==="theme")set(e.data.value)})})();`,
        }}
      />
      {children}
    </div>
  );
}

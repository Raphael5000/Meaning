import type { Metadata } from "next";
import { Martel, Inter, JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Meaning – GA4 AI Chatbot | Chat with Your Google Analytics Data",
  description:
    "Meaning is the AI Google Analytics assistant that lets you chat with your GA4 data in plain English. Get instant insights, reports, and answers — no dashboards, no coding needed.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${martel.variable} ${inter.variable} ${mono.variable}`}>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme")||"dark";var d=t==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light":t;if(d==="dark")document.documentElement.classList.add("dark")}catch(e){}})();`,
          }}
        />
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PSLJLV2V');`,
          }}
        />
        {/* End Google Tag Manager */}
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PSLJLV2V"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function fire(e,p){if(typeof gtag!=='undefined')gtag('event',e,p)}function getPath(){return window.location.pathname}function getLoc(el){if(el.closest('nav,[class*="nav"]'))return'nav';if(el.closest('footer,[class*="footer"]'))return'footer';if(el.closest('[class*="hero"]'))return'hero';return'page'}document.addEventListener('DOMContentLoaded',function(){document.addEventListener('click',function(e){var el=e.target.closest('a,button');if(!el)return;var href=el.getAttribute('href')||'';var text=(el.innerText||'').trim().substring(0,60);var path=getPath();var loc=getLoc(el);if(el.closest('nav,[class*="nav"]')){fire('nav_click',{link_text:text,destination:href,page_path:path});return}if(href.indexOf('/signup')>-1||href.indexOf('/connect-analytics')>-1){fire('sign_up',{method:'free_trial',cta_text:text,cta_location:loc,page_path:path});return}if(el.matches('button,[class*="btn"],[class*="button"]')){fire('cta_click',{cta_text:text,cta_location:loc,page_path:path})}},true);document.addEventListener('submit',function(e){fire('generate_lead',{form_type:'contact',page_path:getPath()})},true);var p=getPath();if(p==='/signup')fire('sign_up',{method:'page_load',page_path:p});if(p==='/pricing')fire('view_pricing',{page_path:p});if(p==='/connect-analytics')fire('sign_up',{method:'connect_analytics',page_path:p});});})();`,
          }}
        />
      </body>
    </html>
  );
}

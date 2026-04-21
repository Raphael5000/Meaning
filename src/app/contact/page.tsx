import type { Metadata } from "next";
import ContactPage from "./ContactContent";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Meaning team. We'd love to hear from you about partnerships, enterprise plans, or anything else.",
  alternates: { canonical: "/contact" },
};

export default function Page() {
  return <ContactPage />;
}

import { NextResponse } from "next/server";
import { sendAlertEmail } from "@/lib/resend";

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10a37f;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Name</td>
            <td style="padding: 8px 12px;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Email</td>
            <td style="padding: 8px 12px;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Subject</td>
            <td style="padding: 8px 12px;">${subject}</td>
          </tr>
        </table>
        <div style="margin-top: 16px; padding: 16px; background: #f9f9f9; border-radius: 8px;">
          <p style="margin: 0; color: #555; font-weight: bold;">Message</p>
          <p style="margin: 8px 0 0; white-space: pre-wrap;">${message}</p>
        </div>
      </div>
    `;

    await sendAlertEmail(
      ["matt@hivory.io"],
      `Contact Form: ${subject}`,
      html
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}

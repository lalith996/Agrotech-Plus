
import type { NextApiRequest, NextApiResponse } from "next";
import { sendEmail } from "@/lib/sendgrid";

// In a real application, use environment variables for email addresses
const TO_EMAIL = process.env.CONTACT_FORM_TO_EMAIL || "your-email@example.com";
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@your-domain.com";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message || !email.includes("@")) {
      return res.status(400).json({ error: "All fields are required and email must be valid." });
    }

    const emailHtml = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr />
      <h3>Message:</h3>
      <p>${message.replace(/\n/g, "<br>")}</p>
      <hr />
      <p><small>This email was sent from the website contact form.</small></p>
    `;

    await sendEmail({
      to: TO_EMAIL,
      from: FROM_EMAIL, // This must be a verified sender in your SendGrid account
      replyTo: email, // Allows you to reply directly to the user
      subject: `New Inquiry from ${name}: ${subject}`,
      html: emailHtml,
    });

    return res.status(200).json({
      success: true,
      message: "Thank you for your message! We'll be in touch soon.",
    });

  } catch (error) {
    // console.error("Contact form error:", error);
    return res.status(500).json({
      error: "Sorry, we were unable to send your message. Please try again later.",
    });
  }
}

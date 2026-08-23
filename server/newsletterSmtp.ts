import nodemailer from "nodemailer";
import cron from "node-cron";

interface DigestResult {
  success: boolean;
  message: string;
  emailCount?: number;
  recipient?: string;
  timestamp?: string;
  previewList?: string[];
  error?: string;
}

let lastDigestLog: {
  timestamp: string;
  status: "success" | "failed";
  emailCount: number;
  message: string;
} | null = null;

/**
 * Creates the Nodemailer SMTP transporter using environment variables.
 * Supports standard Gmail App Password, Custom SMTP host/port, or generic SMTP service.
 */
function createSmtpTransporter() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;

  if (!user || !pass) {
    return null;
  }

  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  // Default to standard Gmail service
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

/**
 * Scrapes or extracts subscriber emails from the hidden page / archive without touching Supabase directly.
 */
export async function scrapeSubscriberEmails(baseUrl: string = "http://127.0.0.1:3000"): Promise<string[]> {
  try {
    // 1. Fetch the site's hidden archive page HTML
    const targetUrl = `${baseUrl.replace(/\/$/, "")}/#/archive`;
    let htmlContent = "";

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Zetsu-Monthly-Digest-Bot/1.0",
          "Accept": "text/html,application/xhtml+xml,application/json,*/*"
        }
      });
      if (response.ok) {
        htmlContent = await response.text();
      }
    } catch {
      // Fallback: try fetching root
      try {
        const rootRes = await fetch(baseUrl);
        if (rootRes.ok) {
          htmlContent = await rootRes.text();
        }
      } catch {
        htmlContent = "";
      }
    }

    // 2. Extract anything that looks like an email address using Regex
    const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
    const rawMatches = htmlContent.match(emailRegex) || [];

    // Filter out common code artifacts or framework keywords
    const filteredEmails = rawMatches.filter(email => {
      const lower = email.toLowerCase();
      return (
        lower.includes(".") &&
        !lower.endsWith(".png") &&
        !lower.endsWith(".jpg") &&
        !lower.endsWith(".svg") &&
        !lower.endsWith(".js") &&
        !lower.endsWith(".ts") &&
        !lower.includes("example.com") &&
        !lower.includes("w3.org")
      );
    });

    const uniqueEmails = Array.from(new Set(filteredEmails));
    return uniqueEmails;
  } catch (error: any) {
    console.error("[SMTP] Error scraping hidden page emails:", error);
    return [];
  }
}

/**
 * Compiles and dispatches the monthly subscriber email digest to keysub.kevin@gmail.com
 */
export async function sendMonthlyNewsletterDigest(options?: { manual?: boolean; customEmails?: string[] }): Promise<DigestResult> {
  const recipient = process.env.SMTP_TO || process.env.DIGEST_RECIPIENT || "keysub.kevin@gmail.com";
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD;

  // Gather emails from the hidden page (or passed from client memory if available)
  let emailList: string[] = options?.customEmails || [];
  if (emailList.length === 0) {
    emailList = await scrapeSubscriberEmails();
  }

  // Deduplicate
  const uniqueEmails = Array.from(new Set(emailList.map(e => e.trim().toLowerCase()))).filter(Boolean);

  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const emailBody = `
========================================
 ZETSU ARCHIVE - MONTHLY SUBSCRIBER DIGEST
 Dispatch Date: ${formattedDate} (22nd Monthly Cycle)
 Total Subscribers: ${uniqueEmails.length}
========================================

SUBSCRIBER EMAILS:
${uniqueEmails.length > 0 ? uniqueEmails.map((e, idx) => `${idx + 1}. ${e}`).join("\n") : "(No active subscriber emails found on hidden page)"}

----------------------------------------
This automated dispatch is sent on the 22nd of each month directly to ${recipient}.
`;

  if (!user || !pass) {
    const errorMsg = "SMTP credentials (SMTP_USER and SMTP_PASS) are not configured in environment variables.";
    lastDigestLog = {
      timestamp: new Date().toISOString(),
      status: "failed",
      emailCount: uniqueEmails.length,
      message: errorMsg,
    };
    return {
      success: false,
      message: errorMsg,
      emailCount: uniqueEmails.length,
      recipient,
      previewList: uniqueEmails,
      error: "MISSING_CREDENTIALS",
    };
  }

  try {
    const transporter = createSmtpTransporter();
    if (!transporter) {
      throw new Error("Failed to initialize SMTP transporter.");
    }

    const info = await transporter.sendMail({
      from: `"Zetsu EOE Archive" <${user}>`,
      to: recipient,
      subject: `[ZETSU] Monthly Newsletter Subscriber List - ${formattedDate} (${uniqueEmails.length} Subscribers)`,
      text: emailBody,
      html: `
        <div style="font-family: monospace, sans-serif; background-color: #0b0c10; color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #1f2833;">
          <h2 style="color: #00c2ff; margin-top: 0; text-transform: uppercase; letter-spacing: 2px;">
            Zetsu Monthly Subscriber Digest
          </h2>
          <p style="color: #c5c6c7; font-size: 13px;">
            <strong>Cycle Date:</strong> ${formattedDate} (22nd of Month)<br/>
            <strong>Total Active Subscribers:</strong> <span style="color: #00c2ff; font-weight: bold;">${uniqueEmails.length}</span><br/>
            <strong>Target Recipient:</strong> ${recipient}
          </p>
          <hr style="border: 0; border-top: 1px solid #1f2833; margin: 20px 0;" />
          <h3 style="color: #ffffff; font-size: 14px; text-transform: uppercase;">Subscriber List:</h3>
          <div style="background-color: #050608; padding: 16px; border-radius: 8px; border: 1px solid #1f2833; max-height: 400px; overflow-y: auto;">
            ${uniqueEmails.length > 0 
              ? `<ol style="margin: 0; padding-left: 20px; line-height: 1.8; color: #66fcf1;">${uniqueEmails.map(e => `<li>${e}</li>`).join("")}</ol>` 
              : `<p style="color: #888;">No subscriber emails detected on hidden page.</p>`}
          </div>
          <p style="color: #555; font-size: 11px; margin-top: 20px;">
            Generated automatically by Zetsu Server SMTP service.
          </p>
        </div>
      `,
    });

    console.log(`[SMTP] Monthly digest successfully sent to ${recipient}. MessageId: ${info.messageId}`);
    lastDigestLog = {
      timestamp: new Date().toISOString(),
      status: "success",
      emailCount: uniqueEmails.length,
      message: `Sent successfully to ${recipient} (Message ID: ${info.messageId})`,
    };

    return {
      success: true,
      message: `Monthly digest successfully delivered to ${recipient}`,
      emailCount: uniqueEmails.length,
      recipient,
      timestamp: new Date().toISOString(),
      previewList: uniqueEmails,
    };
  } catch (error: any) {
    console.error("[SMTP] Failed to send monthly email digest:", error);
    lastDigestLog = {
      timestamp: new Date().toISOString(),
      status: "failed",
      emailCount: uniqueEmails.length,
      message: error.message || "Failed to send email",
    };
    return {
      success: false,
      message: error.message || "Failed to send email via SMTP",
      emailCount: uniqueEmails.length,
      recipient,
      error: error.message,
      previewList: uniqueEmails,
    };
  }
}

/**
 * Initializes the automated monthly cron job scheduled for the 22nd of every month.
 * Cron expression: '0 9 22 * *' (At 09:00 AM on the 22nd day of each month)
 */
export function initializeMonthlyDigestCron() {
  // Runs at 09:00 AM UTC on the 22nd day of every month
  cron.schedule("0 9 22 * *", async () => {
    console.log("[SMTP Cron] Triggering automated 22nd of the month subscriber digest...");
    try {
      await sendMonthlyNewsletterDigest();
    } catch (err) {
      console.error("[SMTP Cron] Error running monthly 22nd digest job:", err);
    }
  });

  console.log("[SMTP Cron] Monthly 22nd Newsletter Digest scheduler initialized ('0 9 22 * *').");
}

/**
 * Returns current SMTP service diagnostics.
 */
export function getSmtpStatus() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD;
  const recipient = process.env.SMTP_TO || process.env.DIGEST_RECIPIENT || "keysub.kevin@gmail.com";

  return {
    isConfigured: Boolean(user && pass),
    senderUser: user ? `${user.substring(0, 3)}***@${user.split("@")[1] || "gmail.com"}` : null,
    recipient,
    schedule: "Every month on the 22nd at 09:00 UTC",
    cronPattern: "0 9 22 * *",
    lastLog: lastDigestLog,
  };
}

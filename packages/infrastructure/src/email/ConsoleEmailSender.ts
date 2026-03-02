import type { IEmailSender, EmailMessage } from "./IEmailSender";

/**
 * Development/testing email sender.
 * Logs email content to console instead of actually sending.
 */
export class ConsoleEmailSender implements IEmailSender {
  async send(message: EmailMessage): Promise<void> {
    const to = Array.isArray(message.to) ? message.to.join(", ") : message.to;
    console.log(
      `[ConsoleEmailSender] Email would be sent:\n` +
        `  To: ${to}\n` +
        `  Subject: ${message.subject}\n` +
        `  HTML (${message.html.length} chars)\n` +
        (message.attachments?.length
          ? `  Attachments: ${message.attachments.map((a) => a.filename).join(", ")}\n`
          : ""),
    );
  }
}

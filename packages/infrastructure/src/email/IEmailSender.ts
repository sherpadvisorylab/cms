/**
 * Pluggable email sender interface.
 * Implement this to connect any email provider (SMTP, SendGrid, SES, etc.)
 */
export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Uint8Array | string;
  mimeType: string;
}

export interface IEmailSender {
  send(message: EmailMessage): Promise<void>;
}

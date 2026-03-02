/**
 * Minimal email template engine.
 * Replaces {{variable}} placeholders with values from the provided variables map.
 * Safe for Node.js and browser — no external dependencies.
 */
export class EmailTemplateEngine {
  /**
   * Render a template string by replacing {{variable}} placeholders.
   * Unknown variables are left as-is (empty string replacement would hide bugs).
   */
  static render(template: string, variables: Record<string, string | number | undefined>): string {
    return template.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (match, key: string) => {
      const trimmedKey = key.trim();
      const value = variables[trimmedKey];
      if (value === undefined || value === null) {
        return match; // Keep original placeholder if variable not found
      }
      return String(value);
    });
  }

  /**
   * Render both subject and body of an email template.
   */
  static renderTemplate(
    template: { subject: string; body: string },
    variables: Record<string, string | number | undefined>,
  ): { subject: string; html: string } {
    return {
      subject: this.render(template.subject, variables),
      html: this.render(template.body, variables),
    };
  }
}

import { describe, it, expect } from "vitest";
import { EmailTemplateEngine } from "../email/EmailTemplateEngine";

describe("EmailTemplateEngine.render", () => {
  it("replaces simple variables", () => {
    const result = EmailTemplateEngine.render(
      "Hello {{name}}, welcome to {{program}}!",
      { name: "Alice", program: "Espresso Lab" },
    );
    expect(result).toBe("Hello Alice, welcome to Espresso Lab!");
  });

  it("leaves unknown placeholders as-is", () => {
    const result = EmailTemplateEngine.render(
      "Dear {{startup_name}}, click {{unknown_var}}",
      { startup_name: "TechCo" },
    );
    expect(result).toBe("Dear TechCo, click {{unknown_var}}");
  });

  it("handles variables with spaces inside braces", () => {
    const result = EmailTemplateEngine.render(
      "Hello {{ name }}!",
      { name: "Bob" },
    );
    expect(result).toBe("Hello Bob!");
  });

  it("converts numeric values to strings", () => {
    const result = EmailTemplateEngine.render("Amount: {{amount}}", { amount: 42 });
    expect(result).toBe("Amount: 42");
  });

  it("handles empty template", () => {
    expect(EmailTemplateEngine.render("", {})).toBe("");
  });
});

describe("EmailTemplateEngine.renderTemplate", () => {
  it("renders both subject and html", () => {
    const result = EmailTemplateEngine.renderTemplate(
      {
        subject: "Application for {{startup_name}}",
        body: "<p>Hello {{startup_name}}, your application is received.</p>",
      },
      { startup_name: "BioStartup" },
    );
    expect(result.subject).toBe("Application for BioStartup");
    expect(result.html).toBe("<p>Hello BioStartup, your application is received.</p>");
  });
});

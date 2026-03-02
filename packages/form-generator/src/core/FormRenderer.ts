import type {
  FormSchema,
  GroupDefinition,
  FieldDefinition,
  ConsentField,
} from "../types";

export class FormRenderer {
  /**
   * Render the complete form as HTML.
   */
  static renderForm(schema: FormSchema): string {
    let html = '<form class="cms-form">';

    for (const group of schema.groups) {
      html += this.renderGroup(group);
    }

    if (schema.consentFields) {
      html += this.renderConsentFields(schema.consentFields);
    }

    html += '<button type="submit" class="btn btn-primary">Submit</button>';
    html += "</form>";
    return html;
  }

  /**
   * Render a single group.
   */
  private static renderGroup(group: GroupDefinition): string {
    let html = `<div class="form-group ${group.collapsed ? "collapsed" : ""}">`;
    html += `<h3>${this.escapeHtml(group.label)}</h3>`;
    if (group.description) {
      html += `<p class="text-muted">${this.escapeHtml(group.description)}</p>`;
    }
    html += '<div class="row">';

    for (const field of group.fields) {
      html += this.renderField(field);
    }

    html += "</div></div>";
    return html;
  }

  /**
   * Render a single field.
   */
  private static renderField(field: FieldDefinition): string {
    const { id, label, type, required, width } = field;
    let html = `<div class="${width}">`;
    html += `<label for="${id}">${this.escapeHtml(label)}${
      required ? " *" : ""
    }</label>`;

    switch (type) {
      case "textarea":
        html += `<textarea id="${id}" name="${id}" ${
          required ? "required" : ""
        }></textarea>`;
        break;

      case "select":
        html += `<select id="${id}" name="${id}" ${
          required ? "required" : ""
        }>`;
        field.options?.forEach((opt) => {
          html += `<option value="${this.escapeHtml(opt.value)}" ${
            opt.isDefault ? "selected" : ""
          }>${this.escapeHtml(opt.label)}</option>`;
        });
        html += `</select>`;
        break;

      case "radio":
        field.options?.forEach((opt) => {
          html += `<div class="radio-option">`;
          html += `<input type="radio" id="${id}-${opt.id}" name="${id}" value="${this.escapeHtml(opt.value)}" ${opt.isDefault ? "checked" : ""} ${required ? "required" : ""} />`;
          html += `<label for="${id}-${opt.id}">${this.escapeHtml(opt.label)}</label>`;
          html += `</div>`;
        });
        break;

      case "checkbox":
        field.options?.forEach((opt) => {
          html += `<div class="checkbox-option">`;
          html += `<input type="checkbox" id="${id}-${opt.id}" name="${id}[]" value="${this.escapeHtml(opt.value)}" ${opt.isDefault ? "checked" : ""} />`;
          html += `<label for="${id}-${opt.id}">${this.escapeHtml(opt.label)}</label>`;
          html += `</div>`;
        });
        break;

      case "yes_no":
        html += `<div class="yes-no-group">`;
        html += `<input type="radio" id="${id}-yes" name="${id}" value="yes" ${
          required ? "required" : ""
        } />`;
        html += `<label for="${id}-yes">Yes</label>`;
        html += `<input type="radio" id="${id}-no" name="${id}" value="no" ${
          required ? "required" : ""
        } />`;
        html += `<label for="${id}-no">No</label>`;
        html += `</div>`;
        break;

      case "rating":
        const max = field.maxValue ?? 5;
        html += `<div class="rating-group">`;
        for (let i = 1; i <= max; i++) {
          html += `<input type="radio" id="${id}-${i}" name="${id}" value="${i}" ${
            required ? "required" : ""
          } />`;
          html += `<label for="${id}-${i}">${i}</label>`;
        }
        html += `</div>`;
        break;

      case "file_upload":
        html += `<input type="file" id="${id}" name="${id}" ${
          required ? "required" : ""
        } />`;
        break;

      case "email":
      case "url":
      case "phone":
      case "number":
      case "date":
      case "time":
      case "datetime":
        html += `<input type="${type}" id="${id}" name="${id}" ${
          required ? "required" : ""
        } />`;
        break;

      default:
        // text
        html += `<input type="text" id="${id}" name="${id}" ${
          required ? "required" : ""
        } />`;
    }

    html += "</div>";
    return html;
  }

  /**
   * Render consent checkboxes.
   */
  private static renderConsentFields(consents: ConsentField[]): string {
    let html = '<div class="consent-fields">';
    consents.forEach((consent, i) => {
      html += `<div class="consent-field">`;
      html += `<input type="checkbox" id="consent-${i}" name="consent-${i}" ${
        consent.required ? "required" : ""
      } />`;
      html += `<label for="consent-${i}">`;
      html += this.escapeHtml(consent.text);
      if (consent.link) {
        html += ` <a href="${this.escapeHtml(consent.link)}" target="_blank">${this.escapeHtml(consent.label)}</a>`;
      }
      html += `</label>`;
      html += `</div>`;
    });
    html += "</div>";
    return html;
  }

  /**
   * Escape HTML to prevent XSS.
   * String-based — safe for Node.js / SSR (no DOM dependency).
   */
  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

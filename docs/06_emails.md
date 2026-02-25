# CMS – Emails

This document describes the email system: templates, variables, API, integration. For the overall CMS logic and concepts, see [01 – Overview](./01_overview.md).

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Template Management](#template-management)
5. [API Reference](#api-reference)
6. [Components](#components)
7. [Integration Guide](#integration-guide)
8. [Template Variables](#template-variables)

---

## Overview

The Email System is a comprehensive solution for managing and sending transactional emails. It provides a centralized template management system with support for template variables, categorization, and integration with third-party projects.

### Key Features

- **Template Management**: Centralized management of all email templates
- **Template Variables**: Dynamic content replacement using variable syntax
- **Categorization**: Organize templates by category for better management
- **Multi-Provider Support**: Architecture supports multiple email providers, but only one provider can be configured in environment variables at a time
- **Function-based API**: Send emails programmatically via library functions from external systems
- **Configurable**: Base email templates can be defined, extensible with vertical project configs
- **Reusable Components**: UI components for template editing and email sending, integrable in third-party systems

---

## Architecture

### System Components

The Email System consists of three main components:

1. **Email Template Repository**: Stores and manages email templates
2. **Email Sender Service**: Handles email delivery via configured email providers
   - **Multi-Provider Architecture**: The system architecture supports multiple email providers
   - **Single Provider Configuration**: Only one email provider can be configured in environment variables at a time
   - **Provider Selection**: The vertical project configures one provider in the `.env` file
3. **Template Editor Component**: UI component for editing templates (integrable in third-party systems)

### Integration Points

The Email System can be integrated into various applications and systems:

- **Library Integration**: Import and use the Email System as a library in your application
- **External Systems**: Use the Email System functions from external systems
- **UI Components**: Integrate reusable components for template editing and email sending in third-party systems

### Data Flow

1. **Template Definition**: Templates are defined in configuration (base config or vertical project config)
2. **Template Storage**: Templates are stored in the email template repository
3. **Template Editing**: Templates can be edited via the Template Editor Component
4. **Email Sending**: Emails are sent via the Email Sender Service using template ID and variables

---

## Configuration



#### Base Config Structure

```typescript

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category?: string; // Category as a string (e.g., "onboarding", "notifications")
  subject: string;
  message: string;
  variables: string[]; // Available variables for this template
  defaultSubject?: string;
  defaultMessage?: string;
}
```

#### Example Base Configuration

```javascript
{
  templates: [
    {
      id: 'csv_import_acceptance',
      name: 'CSV Import - Acceptance Notification',
      description: 'Sent to users when they are imported via CSV',
      category: 'onboarding', // Category as a string
      subject: 'Welcome - Complete Your Registration',
      message: 'Dear {{user_name}},\n\n...',
      variables: ['user_name', 'program_name', 'tc_link', 'registration_link'],
      defaultSubject: 'Welcome - Complete Your Registration',
      defaultMessage: 'Dear {{user_name}},\n\n...'
    },
    {
      id: 'block_access',
      name: 'Block Access - Exclusion Notification',
      description: 'Sent when access is blocked',
      category: 'notifications', // Category as a string
      subject: 'Access Suspended',
      message: 'Dear {{user_name}},\n\n...',
      variables: ['user_name'],
      defaultSubject: 'Access Suspended',
      defaultMessage: 'Dear {{user_name}},\n\n...'
    },
    // ... more templates
  ]
}
```

### Email Sender Configuration

The Email System requires email provider configuration to send emails. This configuration is provided via environment variables (`.env` file).

**Important**: The Email System architecture **supports multiple email providers**, but **only one provider can be configured in environment variables at a time**. The vertical project chooses which email provider/library to use and configures it in the `.env` file.

#### Multi-Provider Architecture

The Email System is built with a pluggable architecture that supports multiple email providers:

- **Architecture Support**: The system architecture is designed to support multiple email providers
- **Single Provider Configuration**: Only one email provider can be configured in environment variables at a time
- **Provider Abstraction**: The Email System abstracts provider-specific details, allowing you to switch providers by changing environment variables without changing template code

### Vertical Project Configuration

Third-party projects can extend the base email configuration by providing a vertical configuration. Both base and vertical templates must be loaded using `loadTemplates()` - they are not automatically loaded.

#### Vertical Config Structure

```typescript
interface VerticalEmailConfig {
  templates?: EmailTemplate[]; // Additional templates
}
```

#### Passing Configuration to Email System

The vertical project configuration can be passed to the Email System during application initialization. The application can call `loadTemplates()` to load both base and vertical templates.

##### Initialization Flow

1. **Project defines vertical config**: The project creates its email configuration object with templates
2. **Application initialization**: The project initializes the application/library, passing the vertical email config
3. **Templates are loaded**: The application calls `emailService.loadTemplates()` for base templates, then for vertical templates
4. **Templates are available**: After initialization, all templates (base + vertical) are available for use

##### Example: Passing Vertical Config

```typescript
import { emailService } from '@sherpadvisorylab/cms/email';

// Project defines vertical email configuration
const projectEmailConfig: VerticalEmailConfig = {
  templates: [
    {
      id: 'project_specific_notification',
      name: 'Project Specific Notification',
      description: 'Custom notification for this project',
      category: 'project',
      subject: 'Project Update',
      message: 'Hello {{user_name}},\n\n...',
      variables: ['user_name', 'project_data']
    }
  ]
};

// Load base templates first
emailService.loadTemplates(baseTemplates);

// Load vertical/project templates
emailService.loadTemplates(projectEmailConfig.templates);

// Email System is now initialized with merged config
// All templates (base + vertical) are available
```

#### Template Loading Process

Templates are loaded using `loadTemplates()` - this is the **only** method to populate the Email System:

1. **Base templates** are loaded first via `emailService.loadTemplates(baseTemplates)`
2. **Vertical/project templates** are loaded via `emailService.loadTemplates(verticalTemplates)`
   - If a vertical template has the same ID as a base template, it **overwrites** the base template
   - New template IDs are added to the system
3. Templates are stored in an object with template ID as the key
4. You can call `loadTemplates()` multiple times - templates with the same ID will overwrite existing ones
5. **Email sender configuration** is read from environment variables (`.env`)

**Note**: The Email System starts empty. Templates must be explicitly loaded using `loadTemplates()`. The loading order matters - templates loaded later will overwrite templates with the same ID loaded earlier. Categories are simple strings and are not managed separately.

#### Example Vertical Config

```javascript
// Project-specific email config
{
  templates: [
    {
      id: 'project_specific_notification',
      name: 'Project Specific Notification',
      description: 'Custom notification for this project',
      category: 'project',
      subject: 'Project Update',
      message: 'Hello {{user_name}},\n\n...',
      variables: ['user_name', 'project_data']
    }
  ]
  // Categories are defined as strings in template category fields
  // No separate categories array needed
}
```

---

## Template Management

### Template Storage

The Email System starts with **no templates loaded**. Templates must be explicitly loaded into the system using a dedicated function. Templates are stored internally in an object where the key is the template ID.

#### Internal Storage Structure

```typescript
// Internal storage (simplified representation)
{
  [templateId: string]: EmailTemplate
}

// Example:
{
  "csv_import_acceptance": {
    id: "csv_import_acceptance",
    name: "CSV Import - Acceptance Notification",
    // ... other template properties
  },
  "block_access": {
    id: "block_access",
    name: "Block Access - Exclusion Notification",
    // ... other template properties
  }
}
```

#### Template Loading Behavior

- **Initial State**: Email System starts empty (no templates)
- **Loading**: Templates are loaded via a dedicated function
- **Overwriting**: If a template with the same ID is loaded again, it **overwrites** the existing one
- **Key-based Storage**: Templates are stored in an object with template ID as the key

### Template Structure

Each email template consists of:

- **ID**: Unique identifier (used as key in internal storage and for function calls)
- **Name**: Human-readable name
- **Description**: Purpose and usage description
- **Category**: Optional categorization
- **Subject**: Email subject line (supports variables)
- **Message**: Email body content (supports variables)
- **Variables**: List of available variables for this template
- **Default Values**: Optional default subject and message (for reset functionality)

### Template Variables

Templates support variable replacement using double curly brace syntax: `{{variable_name}}`

#### Variable Syntax

- Variables are enclosed in double curly braces: `{{variable_name}}`
- Variable names are case-sensitive
- Variables can appear in both subject and message
- Variables are replaced at email send time

#### Example Template

```
Subject: Welcome {{user_name}} to {{program_name}}

Message:
Dear {{user_name}},

We are pleased to inform you that you have been accepted into the {{program_name}} program.

To complete your registration, please:
1. Accept the Terms & Conditions: {{tc_link}}
2. Complete your registration: {{registration_link}}

Best regards,
{{company_name}} Team
```

### Template Categories

Templates can be organized into categories using the `category` field. Categories are simple strings (e.g., `"onboarding"`, `"notifications"`, `"system"`). There is no separate category management - categories are defined implicitly by the category strings used in templates.

#### Common Category Strings

- `"onboarding"`: Templates related to user onboarding
- `"notifications"`: General notification templates
- `"system"`: System-generated emails
- `"project"`: Project-specific templates (from vertical config)

#### Category Search

You can search for templates by category using the `listTemplates()` function with a category parameter. The function returns all templates that match the specified category string.

---

## API Reference

The Email System exposes JavaScript/TypeScript functions (not REST endpoints) for managing templates and sending emails. These functions can be imported and used directly in your code.

### Email Template Interface

The Email System exports a TypeScript interface that defines the structure of an email template. This interface should be used when creating or working with templates.

#### Interface Definition

```typescript
export interface EmailTemplate {
  id: string;                    // Unique identifier (used as key in storage)
  name: string;                  // Human-readable name
  description: string;            // Purpose and usage description
  category?: string;              // Optional category string
  subject: string;               // Email subject line (supports variables)
  message: string;               // Email body content (supports variables)
  variables: string[];            // List of available variable names
  defaultSubject?: string;        // Optional default subject (for reset)
  defaultMessage?: string;        // Optional default message (for reset)
}
```

#### Usage

```typescript
import { EmailTemplate } from '@sherpadvisorylab/cms/email';

// Create a template using the interface
const myTemplate: EmailTemplate = {
  id: 'my_custom_template',
  name: 'My Custom Template',
  description: 'A custom email template',
  category: 'notifications',
  subject: 'Hello {{user_name}}',
  message: 'Dear {{user_name}},\n\nThis is a custom message.',
  variables: ['user_name'],
  defaultSubject: 'Hello {{user_name}}',
  defaultMessage: 'Dear {{user_name}},\n\nThis is a custom message.'
};

// Use the template with loadTemplates
emailService.loadTemplates([myTemplate]);
```

### Load Templates

Load templates into the Email System. This function is used to populate the system with templates from base config, vertical config, or any other source.

#### Function

```typescript
emailService.loadTemplates(templates: EmailTemplate[]): void
```

#### Parameters

- `templates` (EmailTemplate[]): Array of email templates to load

#### Behavior

- Templates are added to the internal storage object
- If a template with the same ID already exists, it is **overwritten**
- Template ID is used as the key in the internal storage object
- Multiple calls to `loadTemplates` will merge/overwrite templates


### Send Email

Send an email using a template.

#### Function

```typescript
emailService.send(request: EmailSendRequest): Promise<EmailSendResponse>
```

**Note**: This function is asynchronous and returns a Promise. Use `await` or `.then()` to handle the result.

#### Parameters

```typescript
export interface EmailSendRequest {
  templateId: string;
  recipient: string; // Email address
  variables: Record<string, string>; // Variable values
  options?: {
    cc?: string[];
    bcc?: string[];
    attachments?: Attachment[];
  };
}
```

#### Return Type

```typescript
interface EmailSendResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}
```

#### Example

```typescript
import { emailService } from '@sherpadvisorylab/cms/email';

const result = await emailService.send({
  templateId: 'csv_import_acceptance',
  recipient: 'user@example.com',
  variables: {
    user_name: 'John Doe',
    program_name: 'Bronze Program',
    tc_link: 'https://example.com/terms',
    registration_link: 'https://example.com/register?token=abc123'
  }
});

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Error:', result.error);
}
```

### Get Template

Retrieve a template by ID.

#### Function

```typescript
emailService.getTemplate(templateId: string): EmailTemplate | null
```

#### Parameters

- `templateId` (string): The unique identifier of the template

#### Return Type

```typescript
interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category?: string;
  subject: string;
  message: string;
  variables: string[];
  defaultSubject?: string;
  defaultMessage?: string;
}
```

#### Example

```typescript
import { emailService } from '@sherpadvisorylab/cms/email';

const template = emailService.getTemplate('csv_import_acceptance');
if (template) {
  console.log('Template:', template.name);
  console.log('Variables:', template.variables);
}
```

### List Templates

Get all available email templates, optionally filtered by category.

#### Function

```typescript
emailService.listTemplates(category?: string): EmailTemplate[]
```

#### Parameters

- `category` (string, optional): Filter templates by category

#### Return Type

```typescript
EmailTemplate[] // Array of email templates
```

#### Example

```typescript
import { emailService } from '@sherpadvisorylab/cms/email';

// Get all templates
const allTemplates = emailService.listTemplates();

// Get templates by category (returns templates where category === 'onboarding')
const onboardingTemplates = emailService.listTemplates('onboarding');

// Get templates by category (returns templates where category === 'notifications')
const notificationTemplates = emailService.listTemplates('notifications');
```

#### Category Search Behavior

- If `category` is provided, returns only templates where `template.category === category`
- If `category` is `undefined` or not provided, returns all templates
- Category matching is case-sensitive
- Templates without a category (`category` is `undefined`) are not returned when filtering by category

### Update Template

Update a template's subject and/or message.

#### Function

```typescript
emailService.updateTemplate(
  templateId: string,
  updates: UpdateTemplateRequest
): UpdateTemplateResponse
```

#### Parameters

- `templateId` (string): The unique identifier of the template
- `updates` (UpdateTemplateRequest): The fields to update

```typescript
interface UpdateTemplateRequest {
  subject?: string;
  message?: string;
}
```

#### Return Type

```typescript
interface UpdateTemplateResponse {
  success: boolean;
  template?: EmailTemplate;
  error?: string;
}
```

#### Example

```typescript
import { emailService } from '@sherpadvisorylab/cms/email';

const result = emailService.updateTemplate('csv_import_acceptance', {
  subject: 'Updated Welcome Subject',
  message: 'Updated welcome message...'
});

if (result.success && result.template) {
  console.log('Template updated:', result.template);
}
```

### Reset Template

Reset a template to its default values.

#### Function

```typescript
emailService.resetTemplate(templateId: string): ResetTemplateResponse
```

#### Parameters

- `templateId` (string): The unique identifier of the template

#### Return Type

```typescript
interface ResetTemplateResponse {
  success: boolean;
  template?: EmailTemplate;
  error?: string;
}
```

#### Example

```typescript
import { emailService } from '@sherpadvisorylab/cms/email';

const result = emailService.resetTemplate('csv_import_acceptance');

if (result.success && result.template) {
  console.log('Template reset to default:', result.template);
}
```

---

## Components

### Template Editor Component

A reusable UI component for editing email templates, integrable in third-party systems.

#### Component API

```typescript
interface TemplateEditorProps {
  templateId: string;
  onSave?: (template: EmailTemplate) => void;
  onReset?: () => void;
  readonly?: boolean;
}

function TemplateEditor(props: TemplateEditorProps): JSX.Element;
```

#### Usage Example

```jsx
import { TemplateEditor } from '@sherpadvisorylab/cms/email';

function MyEmailSettingsPage() {
  const handleSave = (template) => {
    // Save template via API
    updateTemplate(template.id, {
      subject: template.subject,
      message: template.message
    });
  };

  return (
    <TemplateEditor
      templateId="csv_import_acceptance"
      onSave={handleSave}
      onReset={() => resetTemplate('csv_import_acceptance')}
    />
  );
}
```

#### Features

- Subject and message editing
- Variable highlighting and documentation
- Preview functionality
- Reset to default
- Validation
- Save functionality

### Email Sender Component

A reusable component for sending emails from third-party systems using registered templates.

#### Component API

```typescript
interface EmailSenderProps {
  templateId: string;
  onSend?: (result: EmailSendResponse) => void;
  defaultRecipient?: string;
  defaultVariables?: Record<string, string>;
}

function EmailSender(props: EmailSenderProps): JSX.Element;
```

#### Usage Example

```jsx
import { EmailSender } from '@sherpadvisorylab/cms/email';

function MyNotificationPage() {
  const handleSend = (result) => {
    if (result.success) {
      showSuccess('Email sent successfully');
    } else {
      showError(result.error);
    }
  };

  return (
    <EmailSender
      templateId="csv_import_acceptance"
      defaultRecipient="user@example.com"
      defaultVariables={{
        user_name: "John Doe",
        program_name: "Bronze Program"
      }}
      onSend={handleSend}
    />
  );
}
```

#### Features

- Template selection
- Recipient input
- Variable input form (auto-generated from template)
- Send functionality
- Success/error handling

---

## Integration Guide

### Application Integration

The Email System can be integrated into any application that needs to send transactional emails:

- **User Onboarding**: Send welcome emails, acceptance notifications
- **System Notifications**: Send system alerts, status updates
- **Content Updates**: Notify users of content changes

#### Example: Sending Email from Application

```typescript
import { emailService } from '@sherpadvisorylab/cms/email';

// In an application feature
async function sendWelcomeEmail(userId: string, programId: string) {
  const user = await getUser(userId);
  const program = await getProgram(programId);
  
  await emailService.send({
    templateId: 'csv_import_acceptance',
    recipient: user.email,
    variables: {
      user_name: user.name,
      program_name: program.name,
      tc_link: generateTCLink(userId),
      registration_link: generateRegistrationLink(userId)
    }
  });
}
```

### External System Integration

External systems can integrate with the Email System by importing the library and using its functions directly.

#### Setup

1. Install the Email System library as a dependency
2. Import the email service
3. Use the service functions to manage templates and send emails

#### Example: External System Integration

```typescript
import { emailService } from '@sherpadvisorylab/cms/email';

// Get available templates
const templates = emailService.listTemplates();
console.log('Available templates:', templates);

// Send email
const result = await emailService.send({
  templateId: 'csv_import_acceptance',
  recipient: 'user@example.com',
  variables: {
    user_name: 'John Doe',
    program_name: 'Bronze Program',
    tc_link: 'https://example.com/terms',
    registration_link: 'https://example.com/register'
  }
});

if (result.success) {
  console.log('Email sent successfully:', result.messageId);
}
```

### Third-Party Project Integration

Third-party projects can:

1. **Extend Base Config**: Add project-specific templates via vertical config
2. **Use Components**: Integrate Template Editor and Email Sender components
3. **Use Functions**: Import and use Email System functions directly

#### Passing Vertical Configuration

The vertical email configuration can be passed to the Email System during application initialization. The project provides its email configuration as part of the overall application configuration.

#### Loading Templates

Templates are loaded using the `loadTemplates()` function. This is the **only** way to populate the Email System with templates.

##### Loading Base Templates

```typescript
import { emailService } from '@sherpadvisorylab/cms/email';

// Load base templates from base configuration
const baseTemplates = [
  {
    id: 'csv_import_acceptance',
    name: 'CSV Import - Acceptance Notification',
    description: 'Sent to users when they are imported via CSV',
    category: 'onboarding',
    subject: 'Welcome - Complete Your Registration',
    message: 'Dear {{user_name}},\n\n...',
    variables: ['user_name', 'program_name', 'tc_link', 'registration_link'],
    defaultSubject: 'Welcome - Complete Your Registration',
    defaultMessage: 'Dear {{user_name}},\n\n...'
  },
  // ... more base templates
];

emailService.loadTemplates(baseTemplates);
```

##### Loading Vertical/Project Templates

```typescript
import { emailService } from '@sherpadvisorylab/cms/email';

// Load vertical/project templates
// If any template has the same ID as a base template, it will overwrite it
const projectTemplates = [
  {
    id: 'project_custom_notification',
    name: 'Custom Project Notification',
    description: 'Project-specific notification',
    category: 'project',
    subject: 'Project Update: {{project_name}}',
    message: 'Hello {{user_name}},\n\n...',
    variables: ['user_name', 'project_name']
  }
];

emailService.loadTemplates(projectTemplates);

// Now all templates are available
await emailService.send({
  templateId: 'project_custom_notification',
  recipient: 'user@example.com',
  variables: {
    user_name: 'John Doe',
    project_name: 'My Project'
  }
});
```


#### Template Loading Order

**Important**: The Email System starts empty. Templates must be loaded using `loadTemplates()`. The loading order matters:

1. **Base templates** are loaded first (from base configuration) via `loadTemplates()`
   - These templates are **defined** in the base config but must be **loaded explicitly**
   - The Email System starts empty - base templates are not pre-loaded
2. **Vertical templates** are loaded second (from project config) via `loadTemplates()`
   - If a vertical template has the same ID as a base template, it **overwrites** the base template
   - New template IDs are added to the system
3. Templates are stored in an object with template ID as the key
4. You can load additional templates at any time - they will overwrite existing templates with the same ID

---

## Template Variables

### Common Variables

The following variables are commonly available across templates:

- `{{user_name}}` - User's full name
- `{{user_email}}` - User's email address
- `{{program_name}}` - Program name
- `{{company_name}}` - Company/organization name
- `{{tc_link}}` - Terms & Conditions link
- `{{privacy_link}}` - Privacy Policy link
- `{{registration_link}}` - Registration link
- `{{login_link}}` - Login page link

### Template-Specific Variables

Each template may define additional variables specific to its use case. Refer to the template's `variables` array for the complete list.

### Variable Replacement

Variables are replaced at email send time:

1. Template is retrieved by ID
2. Variables in subject and message are identified
3. Variable values are provided in the send request
4. Variables are replaced with actual values
5. Final email is sent

#### Example

**Template:**
```
Subject: Welcome {{user_name}}

Message:
Hello {{user_name}},
Click here: {{registration_link}}
```

**Send Request:**
```javascript
{
  templateId: "welcome",
  recipient: "user@example.com",
  variables: {
    user_name: "John Doe",
    registration_link: "https://example.com/register?token=abc123"
  }
}
```

**Result:**
```
Subject: Welcome John Doe

Message:
Hello John Doe,
Click here: https://example.com/register?token=abc123
```

---

## Best Practices

### Template Design

1. **Clear Subject Lines**: Use descriptive, action-oriented subject lines
2. **Structured Content**: Use line breaks and formatting for readability
3. **Variable Documentation**: Document all available variables in template description
4. **Default Values**: Always provide default subject and message

### Variable Usage

1. **Required Variables**: Clearly document which variables are required
2. **Optional Variables**: Mark optional variables in documentation
3. **Variable Validation**: Validate variable values before sending
4. **Fallback Values**: Provide fallback values for optional variables

### Integration

1. **Error Handling**: Always handle API errors gracefully
2. **Retry Logic**: Implement retry logic for failed sends
3. **Logging**: Log all email sends for auditing
4. **Testing**: Test templates with various variable combinations

---

## Security Considerations

### Library Access

- The Email System is a library, not a REST API
- Access control is handled at the application level
- Import and use the library functions within your application's security context

### Email Provider Configuration

- **Environment Variables**: Email provider credentials (API keys, passwords, etc.) must be stored in `.env` file
- **Vertical Project Responsibility**: The vertical project chooses the email provider and defines the required environment variables

### Template Validation

- Validate template content to prevent injection attacks
- Sanitize variable values before replacement
- Escape HTML in email content appropriately

### Access Control

- Restrict template editing to authorized users
- Implement role-based access control
- Audit all template modifications

---

## Future Enhancements

Potential areas for future development:

- **HTML Email Templates**: Support for rich HTML email templates
- **Email Scheduling**: Schedule emails for future delivery
- **Email Analytics**: Track email opens, clicks, and engagement
- **A/B Testing**: Test different template variations
- **Multi-language Support**: Support for localized email templates
- **Email Queues**: Queue system for high-volume email sending

---

## References

- **Overview and concepts**: [01 – Overview](./01_overview.md)

*Last Updated: [Current Date]*
*Version: 1.0*

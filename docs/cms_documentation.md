# CMS Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Pages Management](#pages-management)
4. [Areas Management](#areas-management)
5. [Templates](#templates)
6. [Components](#components)
7. [Email System](#email-system)
8. [Authentication System](#authentication-system)
9. [Data Storage](#data-storage)
10. [Settings (Admin)](#settings-admin)
11. [Technical Details](#technical-details)

---

## Overview

The Content Management System (CMS) is a comprehensive solution for managing website content, pages, and configurations. It provides a modular architecture that allows administrators to create, edit, and organize content through an intuitive interface.

### Key Features

- **Multi-Area Content Organization**: Organize pages into distinct areas (e.g., Public Area, Startup Area)
- **Component-Based Page Building**: Build pages using reusable components
- **Template System**: Create and reuse page templates
- **Advanced Area Configuration**: Configure styling, legal compliance, tracking, and access policies per area
- **SEO Management**: Built-in SEO settings for each page
- **Responsive Design**: All interfaces are fully responsive

---

## Architecture

### Core Concepts

#### Areas
Areas are logical containers that group related pages together. Each area can have its own:
- Visual identity (logos, colors, fonts)
- Legal pages and cookie consent settings
- Tracking scripts and analytics
- Access control policies
- Design templates (HTML structure)

#### Pages
Pages are the actual content entities that users can access. Each page:
- Belongs to an area
- Has a URL slug and path
- Contains a structure of components
- Has content data, SEO settings, and style variants
- Can have a parent page (hierarchical structure)

#### Components
Components are reusable UI building blocks sourced from shadcnblocks. Each component:
- Has a JSON schema defining its variables
- Can be configured with backend variables
- Belongs to a category (Hero, Features, Testimonials, etc.)

#### Templates
Templates are pre-configured page structures that can be used to quickly create new pages with a predefined component layout.

---

## Pages Management

The Pages Management interface is the central hub for managing all website pages in the CMS. It provides comprehensive tools for creating, editing, organizing, and managing pages with their components, content, SEO settings, and style configurations.

### Key Features

- **Page List Management**: View and filter all pages by area
- **Component-Based Building**: Build pages using reusable components from the component library
- **Template Support**: Create pages from pre-configured templates
- **Content Editing**: Edit component-specific content data
- **SEO Management**: Configure meta tags, descriptions, and keywords for each page
- **Style Variants**: Apply color palettes and layout modes to pages
- **Hierarchical Organization**: Organize pages in a parent-child structure
- **Status Management**: Control page visibility with Published, Draft, and Archived statuses

For complete documentation on Pages Management, including detailed information on page creation, editing, component management, content data, SEO settings, style variants, and best practices, see [Pages Management Documentation](./pages_management.md).

---

## Areas Management
- **Table Display**: Shows page title, URL slug, target area, status, and last updated date
- **Statistics Dashboard**: Displays counts of Public Pages, Startup Area Pages, and Components

#### Page Actions

1. **Create New Page**
   - Click "New Page" button or use template dropdown
   - Fill in basic information:
     - Page Title (auto-generates URL slug)
     - Parent Page (for hierarchical structure)
     - URL Slug (editable, with full path preview)
     - Target Area (Public or Startup)
     - Status (Published, Draft, Archived)
   - Define initial page structure by adding components
   - Save to create the page

2. **Create from Template**
   - Click dropdown arrow next to "New Page"
   - Select a template from the list
   - Template components are automatically added
   - Customize page details and save

3. **Manage Structure**
   - Click structure icon (sitemap) on any page
   - Add components from the component library
   - Reorder components (move up/down)
   - Remove components
   - Save structure changes

4. **Edit Content & SEO**
   - Click edit icon (pen) on any page
   - Three tabs available:
     - **Content Data**: Edit all component-specific content fields
     - **Style & Theme**: Configure color palette and layout mode
     - **SEO Settings**: Set meta title, description, and keywords

5. **Delete Page**
   - Click delete icon (trash) on any page
   - System pages (Privacy Policy, Terms & Conditions) cannot be deleted

### Component Library Integration
When adding components to pages:
- Browse available components by category
- Components are sourced from approved shadcnblocks library
- Each component can be configured with specific settings
- Components can be reordered within the page structure

### Page Status
- **Published**: Page is live and accessible
- **Draft**: Page is not yet published
- **Archived**: Page is hidden but preserved

### System Pages
Some pages are marked as "System" pages:
- Privacy Policy
- Terms & Conditions

These pages are essential for legal compliance and cannot be deleted, though their content can be edited.

---

## Areas Management

### Overview
Areas (`pmp_admin_cms_areas.html`) are used to organize and configure groups of pages. Each area can have extensive configuration options: basic data, style (logos, favicon, fonts, color schemas), design structure (head/body templates with variables, area CSS/JS), legal pages and cookie consent, tracking, and access policy.

For full documentation of the Areas list page, area creation, and the area edit page (all tabs and data model), see [CMS Areas Documentation](./cms_areas.md).

### Area List View
- Displays all configured areas
- Shows area name, display name, badge style, page count, and status
- Actions: Edit (opens full editor) or Delete

### Creating/Editing Areas

#### Basic Data Tab
- **Area Name (Internal ID)**: Unique identifier (alphanumeric + underscores only, cannot be changed after creation)
- **Icon**: Font Awesome icon class (with icon picker modal)
- **Description**: Text description of the area's purpose
- **Site Name**: Name displayed in the UI
- **Root Path**: Base URL path for the area (e.g., `/`, `/startup`)
- **Status**: Active or Inactive

#### Style Settings Tab

**Logos**
- **Light Logo**: Logo for light theme backgrounds
- **Dark Logo**: Logo for dark theme backgrounds
- Hover-to-upload interface (no explicit upload buttons)
- Default Espresso Lab logos loaded if no custom ones are set

**Favicon**
- Upload favicon with automatic preview generation
- Shows previews in multiple sizes: 16×16, 32×32, 48×48, 64×64, 128×128, 180×180
- Separate previews for light and dark themes

**Fonts**
- **Custom Fonts (via URL)**: Add multiple custom fonts via CSS URLs (e.g., Google Fonts, Adobe Fonts)
  - Each font has a Name and URL
  - Add/remove fonts dynamically
- **Icon Fonts (via URL)**: Add icon font libraries via CSS URLs (e.g., Font Awesome, Material Icons)
  - Each icon font has a Name and URL
  - Add/remove icon fonts dynamically

**Color Schemas**
- Multiple color schemas can be defined
- Each schema includes standard colors:
  - Primary
  - Secondary
  - Accent
  - Success
  - Warning
  - Error
  - Info
  - Background
  - Surface
  - Text
  - Text Muted
  - Border
- Each color has a color picker and text input (hex format)
- One schema can be marked as "Default" (movable badge)
- Default schema cannot be removed
- Add/remove schemas dynamically
- **Import Styles from URL**: Extract colors and fonts from any website URL and import them as a new schema

#### Design Structure Tab
- **Head Template**: Define base HTML `<head>` structure with variables
  - Available variables: `{{pageTitle}}`, `{{siteName}}`, `{{styles}}`, `{{scripts}}`, `{{metaTags}}`, etc.
- **Body Template**: Define base HTML `<body>` structure with variables
  - Available variables: `{{content}}`, `{{footer}}`, `{{trackingScripts}}`, etc.

#### Legal Tab

**Legal Pages**
- Dynamic list of legal pages (Privacy Policy, Terms & Conditions, etc.)
- Each page has:
  - **Title**: Displayed in h1 tag
  - **Path**: Full URL path (includes root path prefix)
  - **Content**: WYSIWYG editor (Quill.js) for rich text content
- Pages are collapsible (click header to collapse/expand)
- When collapsed, shows page title for reference
- Add/remove pages dynamically
- Default pages: Privacy Policy and Terms & Conditions (pre-populated)

**Cookie Consent Bar**
- Enable/disable cookie consent banner
- **Label**: Button/link text (e.g., "Cookie Preferences")
- **Description**: Banner description text
- **Cookie Categories**:
  - **Essential Cookies**: Always enabled, cannot be disabled
  - **Analytics Cookies**: Optional, with WYSIWYG description when enabled
  - **Marketing Cookies**: Optional, with WYSIWYG description when enabled
  - **Functional Cookies**: Optional, with WYSIWYG description when enabled
  - **Custom Categories**: Add unlimited custom categories with name, short description, and WYSIWYG description

#### Tracking Tab
- **Google Analytics**: ID and position (Head, Body Top, Body Bottom)
- **Google Tag Manager**: ID and position (Head, Body Top, Body Bottom)
- **Custom Tracking Scripts**: Add unlimited custom scripts
  - Each script has:
    - Name/Description
    - Script code/content
    - Position (Head, Body Top, Body Bottom)

#### Access Policy Tab
- **Restricted Area Toggle**: Enable if area requires authentication
- When enabled, configure:
  - **Redirect URL**: Where to redirect unauthorized users (login page)
  - **Registration Page**: Optional, with checkbox to enable/disable
  - **Recover Password Page**: Optional, with checkbox to enable/disable

### Area Status
- **Active**: Area appears in filters and is accessible
- **Inactive**: Area is hidden from filters but configuration is preserved

---

## Templates

### Overview
Templates (`pmp_admin_cms_templates.html`) are reusable page structures that speed up page creation.

### Template Management

#### Template List
- Shows template name, description, component count, and last modified date
- Actions: Preview, Edit, Delete

#### Creating Templates
1. Click "Create Template"
2. Enter template name and description
3. Add components from component library
4. Components can be reordered or removed
5. Save template

#### Template Preview
- Preview templates in different device views:
  - Desktop
  - Tablet
  - Mobile
- Shows visual representation of component layout

#### Using Templates
- When creating a new page, use the template dropdown
- Select a template to auto-populate page structure
- Customize page details and content after template application

### Template Components
Templates store a list of component names that will be added to pages created from the template. The actual component configuration is done at the page level.

---

## Components

### Overview
Components (`pmp_admin_cms_components.html`) are UI building blocks that can be sourced from libraries such as shadcnblocks or built in-house. The Components interface allows administrators to create and edit components with HTML (Liquid), CSS, JS, and backend variable configuration (attributes, positioning, preview).

For complete documentation on CMS Components, including the list page, edit/add page, Liquid templates, CodeMirror editor, variable types, positioning, preview, import HTML, and data storage, see [CMS Components Documentation](./cms_components.md).

### Component Categories
- **Hero Sections**: Landing page hero components
- **Features**: Feature grid and list components
- **Testimonials**: Testimonial and review components
- **Pricing**: Pricing table components
- **FAQ**: FAQ accordion components
- **Call to Action**: CTA banner components
- **Footers**: Footer components

### Component Configuration

#### Selecting a Component
1. Browse components by category in the left sidebar
2. Click a component card to select it
3. Configuration panel opens on the right

#### Defining Variables Schema
For each component, define a JSON schema that describes the variables the component needs:

1. **Add Fields**: Click "Add Field" to add a variable
2. For each variable, specify:
   - **Variable Name**: The key name (e.g., `title`, `description`, `imageUrl`)
   - **Type**: 
     - Text (string)
     - Image URL (string with uri format)
     - Color Hex (string with color format)
     - Toggle (boolean)
     - Number
3. **JSON Schema Output**: Automatically generated JSON schema is displayed
4. **Save Component Config**: Save the schema for backend integration

#### Example Schema
```json
{
  "title": "Hero with Video",
  "type": "object",
  "properties": {
    "title": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "videoUrl": {
      "type": "string",
      "format": "uri"
    },
    "ctaText": {
      "type": "string"
    },
    "ctaLink": {
      "type": "string",
      "format": "uri"
    }
  }
}
```

### Component Approval
Only components from the approved shadcnblocks library are available. Components must be configured with their variable schemas before they can be used in pages.

---

## Data Storage

### LocalStorage Keys

The CMS uses browser localStorage for data persistence:

- `pmp_cms_areas`: Array of area configurations
- `pmp_cms_templates`: Array of template definitions
- `pmp_cms_pages`: Array of page data (implied, not explicitly seen in code)
- `pmp_cms_components`: Component configurations (implied)

### Data Structure Examples

#### Area Data Structure
```javascript
{
  name: "Public",
  displayName: "Public Area",
  description: "Public-facing pages",
  icon: "fa-solid fa-globe",
  status: "active",
  rootPath: "/",
  siteName: "Espresso Lab",
  // Style settings
  logos: {
    light: "path/to/logo-light.png",
    dark: "path/to/logo-dark.png"
  },
  favicon: "path/to/favicon.png",
  customFonts: [
    { name: "Inter", url: "https://fonts.googleapis.com/css2?family=Inter" }
  ],
  iconFonts: [
    { name: "Font Awesome", url: "https://cdnjs.cloudflare.com/..." }
  ],
  colorSchemas: [
    {
      name: "Default",
      isDefault: true,
      colors: {
        primary: "#2E5A97",
        secondary: "#283963",
        // ... other colors
      }
    }
  ],
  // Design templates
  headTemplate: "<head>...</head>",
  bodyTemplate: "<body>...</body>",
  // Legal
  legal: {
    pages: [
      {
        title: "Privacy Policy",
        path: "/privacy-policy",
        content: "<p>...</p>"
      }
    ],
    cookieBar: {
      enabled: true,
      label: "Cookie Preferences",
      description: "...",
      categories: [...]
    }
  },
  // Tracking
  tracking: {
    gaId: "G-XXXXXXXXXX",
    gaPosition: "body-bottom",
    gtmId: "GTM-XXXXXXX",
    gtmPosition: "body-top",
    customScripts: [...]
  },
  // Access policy
  accessPolicy: {
    isRestricted: false,
    redirectUrl: "/login",
    registrationPage: "/register",
    recoverPasswordPage: "/recover-password"
  }
}
```

#### Template Data Structure
```javascript
{
  name: "Standard Landing",
  desc: "Hero + Features + CTA",
  components: ["Hero Section", "Features Grid", "CTA Banner"],
  updated: "2 days ago"
}
```

#### Page Data Structure (Inferred)
```javascript
{
  id: 1,
  title: "Home Landing",
  slug: "/",
  fullPath: "/",
  area: "Public",
  status: "Published",
  parentId: null,
  structure: [
    { componentId: "hero-1", order: 1 },
    { componentId: "features-1", order: 2 }
  ],
  content: {
    // Component-specific content data
  },
  seo: {
    metaTitle: "...",
    metaDescription: "...",
    keywords: "..."
  },
  style: {
    colorPalette: "Espresso Blue",
    layoutMode: "Full Width"
  }
}
```

---

## Settings (Admin)

The **Settings** page (`pmp_admin_settings.html`) in the admin area configures platform-wide options. It does **not** store API keys, client secrets or other secrets.

### API keys and secrets

**API keys, client secrets and other secrets must not be entered or stored in the admin UI.** They must be loaded in one of these ways:

- **`.env`** — Environment variables (e.g. `OPENAI_API_KEY`, `AZURE_CLIENT_SECRET`) loaded at build or runtime.
- **External secret manager** — e.g. Cloudflare Secrets, AWS Secrets Manager, Azure Key Vault, HashiCorp Vault; the application reads secrets in memory at runtime.

Integrations configured in Settings store only **non-sensitive** data (URLs, workspace IDs, pipeline names, field mappings). Secrets are never stored in the database or admin interface.

### CMS System Variables

Settings contain the **list of all managed system variables** that can be used inside CMS components (e.g. in HTML templates as `{{ variable }}`).

**How system variable values are resolved at runtime:**

1. **Preferences defined when creating the page structure** — Values can be overridden at area, template or page level when defining the structure.
2. **Default values defined in Settings** — When no override is set, the default value configured in Admin → Settings is used.

So: system variables are **populated** either from (a) preferences set at page-structure creation time, or (b) the default values defined in Settings. The Settings page lists every system variable the CMS manages and allows configuring their defaults.

Examples of managed variables (see [CMS Components](./cms_components.md#system-variables-popup)): **style variables** (e.g. `bg-primary`, `text-muted`, `border-primary`) for color/context; **form (embed)** variables (`{{form:id}}`) for embedding CMS-generated forms.

For the **embeddable component** that manages system variable defaults (usable in Settings or other contexts), see [Settings and system variables component](./settings.md).

---

## Technical Details

### Technologies Used

- **HTML5/CSS3**: Core markup and styling
- **JavaScript (Vanilla)**: All functionality is implemented in vanilla JavaScript
- **Quill.js**: WYSIWYG editor for rich text content (legal pages, cookie descriptions)
- **Font Awesome**: Icon library for UI elements and icon picker
- **localStorage API**: Client-side data persistence

### Key Functions

#### Page Management
- `normalizeSlug(text)`: Converts text to URL-friendly slug
- `handleTitleInput(val)`: Auto-generates slug from title
- `updatePathPreview()`: Updates full path preview based on parent and slug
- `addComponentToPage(name, category)`: Adds component to page structure
- `generateFullContentEditor()`: Generates content fields based on page structure

#### Area Management
- `loadAreaData()`: Loads area configuration from localStorage
- `saveAreaData()`: Saves area configuration to localStorage
- `addColorSchema()`: Adds new color schema
- `setDefaultSchema(id)`: Sets default color schema
- `importStylesFromUrl()`: Imports styles from external website (requires CORS proxy)
- `addLegalPage()`: Adds new legal page
- `addCookieCategory()`: Adds custom cookie category
- `addTrackingScript()`: Adds custom tracking script

#### Template Management
- `selectTemplate(tpl)`: Applies template to new page
- `showPreview(index)`: Shows template preview in modal
- `setPreviewDevice(device)`: Changes preview device view

#### Component Management
- `selectComponent(id)`: Selects component for configuration
- `addField()`: Adds variable field to component schema
- `updateSchema()`: Updates JSON schema based on fields
- `saveComponent()`: Saves component configuration

### Variable System

The CMS uses a template variable system for dynamic content:

#### Head Template Variables
- `{{pageTitle}}`: Current page title
- `{{siteName}}`: Area site name
- `{{styles}}`: Injected CSS/styles
- `{{scripts}}`: Injected JavaScript
- `{{metaTags}}`: SEO meta tags

#### Body Template Variables
- `{{content}}`: Main page content
- `{{footer}}`: Footer content
- `{{trackingScripts}}`: Tracking scripts (based on position settings)

### CORS Considerations

The "Import Styles from URL" feature requires a CORS proxy to fetch external website content. The implementation includes error handling for CORS restrictions.

### Icon Picker

The icon picker modal provides:
- Search functionality
- Grid display of common Font Awesome icons
- Click to select and apply icon

### WYSIWYG Editor

Quill.js is used for:
- Legal page content
- Cookie category descriptions

Each WYSIWYG instance:
- Stores content in a hidden textarea
- Syncs with Quill editor
- Supports rich text formatting

---

## Email System

The CMS includes a comprehensive Email System for managing and sending transactional emails. The Email System provides:

- **Template Management**: Centralized management of email templates
- **Template Variables**: Dynamic content replacement
- **API Integration**: Send emails programmatically from external systems
- **Reusable Components**: UI components for template editing and email sending

For complete documentation of the Email System, including API reference, component usage, and integration guide, see [Email System Documentation](./email_system.md).

### Quick Overview

The Email System allows you to:
- Define email templates with subject and message
- Use variables for dynamic content (e.g., `{{user_name}}`, `{{program_name}}`)
- Categorize templates for better organization
- Edit templates via the admin interface
- Send emails programmatically via API
- Integrate email components in third-party systems

The Email Management page in the admin area provides a UI for editing system email templates. See the [Email Management documentation](../../espressolab.singapore/docs/email_management.md) for details on using the admin interface.

---

## Authentication System

The CMS provides a comprehensive Authentication System that enables external projects to implement a complete authentication flow. The system includes pre-built UI components and a set of email templates required for user authentication, registration, activation, and password recovery.

### Key Features

- **Pre-built Components**: Ready-to-use UI components for login, registration, password recovery, and SSO authentication
- **Email Templates**: Pre-configured email templates for the authentication flow
- **Standard Authentication**: Email/password-based authentication
- **SSO Support**: Single Sign-On integration with Google, Microsoft Teams, GitHub, and other providers
- **Email Activation**: User account activation via email verification
- **Password Recovery**: Secure password reset flow via email

The **activation email** and **password reset (recover password) email** are provided as **base templates** by the CMS Authentication module. Verticals that use the CMS (e.g. Espresso Lab) inherit these templates and the flows that send them; they can expose the templates in their admin Emails page for customization of subject and body.

For complete documentation of the Authentication System, including component usage, email templates, authentication flows, and integration guide, see [Authentication System Documentation](./authentication_system.md).

### CMS Implementation

The Email System is integrated into the CMS as follows:

#### Base Configuration

The CMS provides a base email bucket in its default configuration. This includes common system email templates required for CMS operations. These templates are defined in the CMS base configuration but must be explicitly loaded using `loadTemplates()`.

#### CMS Initialization

When initializing the CMS, the Email System is automatically set up:

1. **Project defines vertical config**: The project creates its email configuration object with templates
2. **CMS initialization**: The project initializes the CMS library, passing the vertical email config
3. **CMS loads templates**: The CMS internally calls `emailService.loadTemplates()` for base templates, then for vertical templates
4. **Templates are available**: After initialization, all templates (base + vertical) are available for use

##### Example: CMS Initialization with Email Config

```typescript
import { cms } from '@sherpadvisorylab/cms';

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

// Initialize CMS with vertical email config
const cmsInstance = cms.init({
  // ... other CMS config
  email: projectEmailConfig // Pass email config to CMS
});

// Email System is now initialized with merged config
// All templates (base + vertical) are available
```

#### Internal CMS Features

The Email System is used by various CMS features:

- **User Onboarding**: Send welcome emails, acceptance notifications
- **System Notifications**: Send system alerts, status updates
- **Content Updates**: Notify users of content changes

##### Example: Sending Email from CMS Feature

```typescript
import { emailService } from '@sherpadvisorylab/cms/email';

// In a CMS feature
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

#### Template Loading in CMS

When using the full CMS, the CMS internally calls `emailService.loadTemplates()` for both base and vertical templates:

```typescript
import { cms } from '@sherpadvisorylab/cms';

// Define vertical email configuration
const projectEmailConfig = {
  templates: [
    {
      id: 'project_custom_notification',
      name: 'Custom Project Notification',
      description: 'Project-specific notification',
      category: 'project',
      subject: 'Project Update: {{project_name}}',
      message: 'Hello {{user_name}},\n\n...',
      variables: ['user_name', 'project_name']
    }
  ]
};

// Initialize CMS with email configuration
// During initialization, CMS internally:
// 1. Calls emailService.loadTemplates() for base templates (from CMS base config)
// 2. Calls emailService.loadTemplates() for vertical templates (from projectEmailConfig)
// Important: Email System starts empty, templates are loaded during CMS init
const cmsInstance = cms.init({
  // ... other CMS configuration (pages, areas, etc.)
  email: projectEmailConfig // Vertical email config passed here
});

// After CMS initialization, templates have been loaded via loadTemplates()
// Project templates can be used immediately:
import { emailService } from '@sherpadvisorylab/cms/email';

await emailService.send({
  templateId: 'project_custom_notification', // Project template is available
  recipient: 'user@example.com',
  variables: {
    user_name: 'John Doe',
    project_name: 'My Project'
  }
});
```

#### Template Loading Order in CMS

1. **Base templates** are loaded first (from CMS base config) via `loadTemplates()`
   - These templates are **defined** in the base config but must be **loaded explicitly**
   - The Email System starts empty - base templates are not pre-loaded
2. **Vertical templates** are loaded second (from project config) via `loadTemplates()`
   - If a vertical template has the same ID as a base template, it **overwrites** the base template

---

## Menu Management

**Status**: To be defined better

The Menu management interface exists but functionality is not yet fully documented. This section will be updated as the menu system is finalized.

---

## Best Practices

### Area Configuration
1. Set up areas before creating pages
2. Configure default color schema first
3. Import styles from reference websites when starting new areas
4. Set up legal pages early for compliance
5. Configure tracking scripts before going live

### Page Creation
1. Use templates for common page types
2. Define page structure before adding content
3. Set SEO settings for all public pages
4. Use hierarchical structure for better organization
5. Test pages in draft mode before publishing

### Component Usage
1. Configure component schemas before using in pages
2. Use consistent naming for variables
3. Document component purposes in descriptions
4. Reuse components across pages for consistency

### Template Management
1. Create templates for frequently used page structures
2. Keep template names descriptive
3. Update templates when component libraries change
4. Preview templates before using

---

## Future Enhancements

Potential areas for future development:
- Backend API integration
- Multi-language support
- Version control for pages
- Advanced permissions system
- Content scheduling
- A/B testing capabilities
- Analytics integration
- Export/import functionality

---

## Support and Maintenance

For issues, questions, or feature requests related to the CMS, please refer to the development team or project documentation.

---

*Last Updated: [Current Date]*
*Version: 1.0*

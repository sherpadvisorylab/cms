# CMS – Pages

This document describes page management in detail: list, creation, structure, content, SEO, hierarchy. For the overall CMS logic and concepts, see [01 – Overview](./01_overview.md).

## Table of Contents

1. [Overview](#overview)
2. [Page Structure](#page-structure)
3. [Page Creation](#page-creation)
4. [Page Editing](#page-editing)
5. [Component Management](#component-management)
6. [Content Data](#content-data)
7. [SEO Settings](#seo-settings)
8. [Style Variants](#style-variants)
9. [Page Status](#page-status)
10. [Default Pages](#default-pages)
11. [System Pages](#system-pages)
12. [Hierarchical Structure](#hierarchical-structure)
13. [Sitemap (sitemap.xml)](#sitemap-sitemapxml)

---

## Overview

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

---

## Page Structure

A page in the CMS consists of several key elements:

### Core Properties

- **Page Title**: Human-readable title for the page
- **URL Slug**: URL-friendly identifier (auto-generated from title, editable)
- **Full Path**: Complete URL path (includes parent path + slug)
- **Target Area**: The area the page belongs to (Public Area, Startup Area, etc.)
- **Parent Page**: Optional parent page for hierarchical structure
- **Status**: Published, Draft, or Archived

### Page Components

- **Component Structure**: Ordered list of components that make up the page
- **Component Configuration**: Each component has its own content data and settings
- **Component Order**: Components can be reordered within the page structure

### Page Metadata

- **Content Data**: Component-specific content fields (titles, descriptions, images, etc.)
- **SEO Settings**: Meta title, meta description, keywords
- **Style Variants**: Color palette selection, layout mode

---

## Page Creation

### Creating a New Page

1. **Access Page Creation**
   - Click the "New Page" button in the Pages Management interface
   - Or use the template dropdown to create from a template

2. **Fill Basic Information**
   - **Page Title**: Enter the page title
     - URL slug is automatically generated from the title
     - Slug can be manually edited if needed
   - **Parent Page**: Select a parent page (optional)
     - If selected, the page becomes a child of the parent
     - Full path is automatically updated based on parent selection
   - **URL Slug**: Edit the auto-generated slug if needed
     - Full path preview shows the complete URL path
   - **Target Area**: Select the area the page belongs to
     - Public Area: Public-facing pages
     - Startup Area: Pages for the startup area
   - **Status**: Set initial status
     - Published: Page is live and accessible
     - Draft: Page is not yet published (default)
     - Archived: Page is hidden but preserved

3. **Define Initial Structure**
   - Add components from the component library
   - Components can be added during page creation or later
   - Components are displayed in the order they will appear on the page

4. **Save Page**
   - Click "Create Page" to save
   - Page is created with the specified structure and settings

### Creating from Template

1. **Select Template**
   - Click the dropdown arrow next to "New Page"
   - Select a template from the list
   - Templates show component count for reference

2. **Template Application**
   - Template components are automatically added to the page structure
   - Page title is pre-filled with template name + "Copy"
   - All other fields remain editable

3. **Customize and Save**
   - Customize page details (title, slug, area, status)
   - Modify component structure if needed
   - Save the page

### Page Creation Modal

The page creation modal is divided into two sections:

- **Left Section**: Basic page information form
- **Right Section**: Initial page structure (components list)

Both sections are visible simultaneously, allowing you to configure page details while building the structure.

---

## Page Editing

Pages can be edited in three ways:

### 1. Structure Management

**Access**: Click the structure icon (sitemap) on any page row

**Features**:
- View all components currently in the page structure
- Add new components from the component library
- Reorder components (move up/down)
- Remove components from the page
- Save structure changes

**Component Library Integration**:
- Browse components by category
- Search for specific components
- Components are sourced from the approved shadcnblocks library
- Only configured components (with schemas) are available

### 2. Content & SEO Editing

**Access**: Click the edit icon (pen) on any page row

**Three Tabs Available**:

#### Content Data Tab
- Edit all component-specific content fields
- Fields are dynamically generated based on page structure
- Each component has its own set of content fields
- Fields are organized by component in numbered sections

#### Style & Theme Tab
- **Color Palette**: Select from available color palettes
  - Palettes are defined at the area level
  - Preview shows color swatches
  - Selected palette is highlighted
- **Layout Mode**: Choose page layout
  - Full Width: Content spans full viewport width
  - Boxed: Content is contained in a boxed layout

#### SEO Settings Tab
- **Meta Title**: Page title as seen in search results
- **Meta Description**: Brief summary of page content for search engines
- **Keywords**: Comma-separated keywords for SEO

### 3. Basic Information Editing

Basic page information (title, slug, parent, area, status) can be edited by:
- Opening the page creation modal in edit mode
- Modifying the fields
- Saving changes

---

## Component Management

### Adding Components

Components can be added to pages in two contexts:

1. **During Page Creation**: Add components to initial structure
2. **In Structure Editor**: Add components to existing pages

**Process**:
1. Click "Add Component" or "Add" button
2. Component Library modal opens
3. Browse or search for components
4. Click on a component to add it to the page
5. Component appears in the structure list

### Component Library

The Component Library provides:
- **Component Categories**: Organize components by type (Hero, Features, Testimonials, etc.)
- **Component Preview**: Visual representation of each component
- **Component Source**: Shows source library (e.g., shadcnblocks)
- **Search Functionality**: Search components by name

**Available Components**:
- Only components that have been configured in the Components management interface are available
- Components must have their variable schemas defined before use
- Components are sourced from approved libraries (e.g., shadcnblocks)

### Reordering Components

Components can be reordered within the page structure:

- **Move Up**: Click the up arrow button on a component
- **Move Down**: Click the down arrow button on a component
- Components maintain their order when the page is rendered

### Removing Components

- Click the delete/trash icon on a component
- Component is removed from the page structure
- Content data associated with the component is also removed

**Note**: Removing a component from structure also removes its content data. If you re-add the component later, you'll need to re-enter the content.

---

## Content Data

Content data is the actual content that populates the components on a page. Each component has its own set of content fields based on its variable schema.

### Content Field Generation

Content fields are automatically generated based on:
1. **Page Structure**: Components currently in the page structure
2. **Component Schemas**: Variable schemas defined for each component in the Components management interface

### Content Field Organization

Content fields are organized by component:
- Each component has its own section in the Content Data tab
- Components are numbered in the order they appear on the page
- Component name is displayed as the section header

### Content Field Types

Content fields vary by component but commonly include:
- **Text Fields**: Titles, subtitles, descriptions
- **Rich Text**: Formatted text content
- **Images**: Image uploads or URLs
- **Links**: URLs for buttons, links, etc.
- **Lists**: Arrays of items (features, testimonials, etc.)

### Editing Content

1. Open the Content & SEO editor for a page
2. Navigate to the Content Data tab
3. Edit fields for each component
4. Changes are saved when you click "Save Content & Settings"

**Important**: Content fields are only available for components that are in the page structure. If you add a component to the structure, its content fields will appear in the Content Data tab.

---

## SEO Settings

Each page has dedicated SEO settings to optimize search engine visibility.

### Meta Title

- **Purpose**: Title displayed in search engine results
- **Best Practice**: Keep under 60 characters
- **Default**: Uses page title if not specified

### Meta Description

- **Purpose**: Brief description shown in search results
- **Best Practice**: Keep between 150-160 characters
- **Format**: Plain text (no HTML)

### Keywords

- **Purpose**: Comma-separated keywords for SEO
- **Format**: `keyword1, keyword2, keyword3`
- **Best Practice**: Use relevant, specific keywords

### SEO Settings Location

SEO settings are accessed via:
- Content & SEO editor → SEO Settings tab

---

## Style Variants

Pages can have different style variants applied to customize their appearance.

### Color Palette

- **Selection**: Choose from color palettes defined at the area level
- **Preview**: Visual preview of color swatches
- **Application**: Selected palette affects the page's color scheme
- **Default**: Uses area's default color schema if not specified

### Layout Mode

- **Full Width**: Content spans the full viewport width
- **Boxed**: Content is contained within a maximum width container

### Style Variants Location

Style variants are accessed via:
- Content & SEO editor → Style & Theme tab

---

## Page Status

Pages can have three different statuses:

### Published

- **Visibility**: Page is live and accessible to users
- **URL**: Page is accessible at its full path
- **Use Case**: Completed pages ready for public viewing

### Draft

- **Visibility**: Page is not accessible to users
- **URL**: Page is not accessible (returns 404 or redirect)
- **Use Case**: Pages under development or review
- **Default**: New pages are created as Draft by default

### Archived

- **Visibility**: Page is hidden but preserved
- **URL**: Page is not accessible
- **Use Case**: Pages that are no longer needed but should be kept for reference
- **Recovery**: Archived pages can be restored to Draft or Published status

### Status Management

- Status can be changed when creating or editing a page
- Status is displayed in the page list with color-coded badges
- Status changes take effect immediately upon saving

---

## Default Pages

The CMS provides a set of **default pages** as reusable components for standard needs (legal compliance and 404). For a **detailed list, behaviour, and utility component props**, see **[03_pages_default.md](./03_pages_default.md)**.

Summary:

- **Page Not Found (404)** — Used when a requested page doesn’t exist; component `NotFoundPage`; customizable.
- **Privacy Policy** — Legal page; component `PrivacyPolicyPage`; content configured in Area → Legal tab (or a CMS page).
- **Terms & Conditions** — Legal page; component `TermsConditionsPage`; same as above.

If an area has no legal data, the CMS can add default Privacy Policy and Terms & Conditions entries (see [02 – Areas](./02_areas.md) Legal tab, `addDefaultLegalPages`). Login, Signup, Forgot password, and related flows are **authentication components**, not default pages — see [07 – Authentication](./07_authentication.md).

### System Pages

Privacy Policy and Terms & Conditions are often treated as **system pages**: they are required for compliance and are managed via Area → Legal tab (and optionally in the Pages list). They use the default page components; see [03_pages_default.md](./03_pages_default.md) and [02 – Areas](./02_areas.md) (Legal).

---

## Hierarchical Structure

Pages can be organized in a hierarchical (parent-child) structure.

### Parent-Child Relationships

- **Parent Page**: A page that has child pages
- **Child Page**: A page that belongs to a parent page
- **Root Page**: A page with no parent (top-level page)

### URL Path Structure

The hierarchical structure affects URL paths:

- **Root Page**: `/slug`
- **Child Page**: `/parent-slug/child-slug`
- **Nested Children**: `/parent-slug/child-slug/grandchild-slug`

### Path Generation

- Full path is automatically generated based on:
  - Parent page path (if selected)
  - Current page slug
- Path preview updates in real-time as you edit the slug or parent
- Path is displayed in the page creation/editing modal

### Parent Selection

- Parent dropdown shows all existing pages
- Pages are displayed as: `Page Title (path)`
- "None (Root)" option creates a top-level page
- Parent selection is optional

### Benefits of Hierarchical Structure

- **URL Organization**: Logical URL structure
- **Navigation**: Easier to build navigation menus
- **Content Organization**: Group related pages together
- **SEO**: Better URL structure for search engines

---

## Sitemap (sitemap.xml)

On **create** and **update** of a page, if the **slug** or **final path** of the page changes, the **sitemap.xml** file at the website root must be updated. The same applies when a page is deleted or when its status changes (e.g. from Published to Draft/Archived): the sitemap must reflect only pages that are actually public and reachable.

### Scope: public areas only

Sitemap updates apply **only to pages that belong to public areas**, i.e. areas **without access restrictions** (Access Policy → *This is a restricted area* unchecked). Pages in areas that require authentication must not be included in sitemap.xml, as they are not indexable as public content.

### Sitemap component

A **dedicated component** (module or service) must:

1. **Generate** the **sitemap.xml** file in standard format (e.g. XML Sitemap for search engines).
2. **Update** the sitemap **in context** with page operations:
   - creation of a new page in a public area;
   - update of a page in a public area when slug or path (or parent affecting the path) changes;
   - change of page status (Published ↔ Draft/Archived);
   - deletion of a page.
3. **Include** in the sitemap only pages that meet all of the following:
   - area is **not** restricted (public);
   - status is **Published**;
   - valid final path (derived from area root path + hierarchy + slug).

The **sitemap.xml** file must be **static**: generated and written to the filesystem (or deployed artifact) at the website root, so that it is served as a static resource (e.g. `https://example.com/sitemap.xml`). Dynamic on-the-fly generation on each HTTP request is not required; the component updates the file when pages are saved or published (or via an asynchronous job tied to the same events).

### Integration with the Pages flow

- On page **create** or **update**, after data is saved, if the area is public and slug/path has changed (or the page has been published/archived/deleted), the backend must call the Sitemap component to regenerate and write **sitemap.xml**.
- The component can read the list of areas (e.g. from [02 – Areas](./02_areas.md)) and filter by `accessPolicy.isRestricted !== true`, then build the list of paths from Published pages in those areas only.

---

## Page List View

### Filtering

Pages can be filtered by area:
- **All Pages**: Shows all pages regardless of area
- **Public Area**: Shows only pages in the Public Area
- **Startup Area**: Shows only pages in the Startup Area

### Table Display

The page list displays:
- **Page Title**: Human-readable page title
- **URL Slug**: The page's URL slug
- **Target Area**: Badge showing which area the page belongs to
- **Status**: Badge showing page status (Published, Draft, Archived)
- **Last Updated**: Timestamp of last modification
- **Actions**: Buttons for structure, content editing, and deletion

### Statistics Dashboard

The page list view includes statistics:
- **Public Pages Count**: Total number of pages in Public Area
- **Startup Area Pages Count**: Total number of pages in Startup Area
- **Components Count**: Total number of configured components

---

## Page Actions

### Available Actions

1. **Manage Structure** (Sitemap icon)
   - Opens structure editor modal
   - Add, remove, reorder components

2. **Edit Content & SEO** (Pen icon)
   - Opens content and SEO editor modal
   - Three tabs: Content Data, Style & Theme, SEO Settings

3. **Delete Page** (Trash icon)
   - Removes page from the system
   - System pages cannot be deleted (button is disabled)

### Action Buttons

Action buttons are displayed in each page row:
- Small outline buttons with icons
- Hover tooltips explain each action
- Delete button is red-colored for visual distinction

---

## Integration with Other CMS Features

### Areas Integration

- Pages belong to areas
- Area configuration affects page rendering (styles, templates, legal pages)
- Area root path is prepended to page paths

### Templates Integration

- Pages can be created from templates
- Templates provide pre-configured component structures
- Templates speed up page creation for common page types

### Components Integration

- Pages use components from the component library
- Components must be configured before use
- Component schemas define available content fields
- Pages themselves can be components (default pages)

### Default Pages Integration

- Default pages are provided as reusable components
- Default pages can be imported and used in vertical projects
- Default pages share a common interface for consistency
- Default pages are stored in a dedicated CMS folder

### Menu Integration

- Pages can be added to navigation menus
- Hierarchical structure helps organize menu items
- Page paths are used for menu links

### Sitemap Integration

- Creation, update (slug/path), status change, or deletion of a page in a **public area** (no access restrictions) triggers regeneration of the static **sitemap.xml** at the website root; see [Sitemap (sitemap.xml)](#sitemap-sitemapxml).

---

## Best Practices

### Page Creation

1. **Plan Structure First**: Define component structure before adding content
2. **Use Templates**: Leverage templates for common page types
3. **Set Status Appropriately**: Use Draft status during development
4. **Organize Hierarchically**: Use parent-child relationships for logical organization

### Content Management

1. **Complete Structure First**: Add all components before editing content
2. **Use Consistent Naming**: Use clear, descriptive page titles
3. **Optimize URLs**: Keep slugs short, descriptive, and URL-friendly
4. **Test Before Publishing**: Review pages in Draft status before publishing

### SEO Optimization

1. **Unique Meta Titles**: Each page should have a unique meta title
2. **Descriptive Meta Descriptions**: Write compelling, informative descriptions
3. **Relevant Keywords**: Use keywords that accurately describe page content
4. **Regular Updates**: Keep SEO settings current with page content

### Component Usage

1. **Reuse Components**: Use the same components across pages for consistency
2. **Follow Component Schemas**: Fill all required component fields
3. **Maintain Order**: Keep component order logical and user-friendly
4. **Test Components**: Verify components render correctly before publishing

---

## References

- **Overview and concepts**: [01 – Overview](./01_overview.md)
- **Areas**: [02 – Areas](./02_areas.md)
- **Components**: [04 – Components](./04_components.md)
- **Templates**: [09 – Templates](./09_templates.md)

*Last Updated: [Current Date]*
*Version: 1.0*

# CMS – Users (platform user management)

This document describes the **Users** management page in the CMS admin area: purpose, roles, list and actions, invite and edit flows, and storage. It is the page where administrators manage platform user accounts and assign roles. The set of roles is **not fixed**: it is provided by a dedicated **Roles component** (utility), so roles can be added, modified, or removed per deployment. For the overall CMS logic, see [01 – Overview](./01_overview.md).

## Table of Contents

1. [Overview](#overview)
2. [Roles](#roles)
   - 2.1 [Roles component (utility)](#21-roles-component-utility)
3. [Users list page](#users-list-page)
4. [Add user (invite)](#add-user-invite)
5. [Edit user](#edit-user)
6. [Actions (reset password, delete)](#actions-reset-password-delete)
7. [Data model and storage](#data-model-and-storage)

---

## Overview

The **Users** page is part of the CMS admin area. It allows authorized users (e.g. Super Admin, Program Manager) to:

- View all platform users in a table (name, email, role, status, last login).
- **Invite** new users (email + role; for Startup role, associate a startup/company).
- **Edit** existing users (name, email, role, status; for Startup role, change startup association).
- **Reset password** (generate temporary password; in production this would trigger an email or API).
- **Delete** users (with confirmation).

**Prototype file**: `pmp_admin_users.html`.

---

## Roles

The Users page does **not** rely on a fixed list of roles. The available roles are provided by a **Roles component** (utility): the same Users UI is used regardless of how many or which roles are configured. The table below describes a typical **default role set**; your deployment may use a subset, a superset, or different labels and permissions.

| Role | Description |
|------|-------------|
| **Super Admin** | Top-level platform administrator; full access to all admin features. |
| **Program Manager** | Program and operational manager; access to Admin Area (Dashboard, Programs, Startups, Advisors, Questionnaires, Insights, CMS, Users, Prompts, Settings). |
| **Advisor** | Mentor or expert; access to Advisor Area (Dashboard, My Startups, evidence review, Calendar, Notifications). |
| **Startup** | Representative of a startup in the program; access to Startup Area. Requires association with a **Startup** (company) when inviting or editing. |

### 2.1 Roles component (utility)

The CMS provides a dedicated **Roles** utility component that:

- **Defines the set of roles** available in the platform. Roles are not hard-coded in the Users page: the page consumes the list of roles from this component (or from the configuration that backs it).
- **Is used wherever a role must be chosen or displayed**:
  - **Users page — Invite / Edit modal**: the **Role** dropdown (required when creating or editing a user) is filled with the roles returned by the component. The user selects one role per user.
  - **Users page — Table**: the **Role** column shows the role label for each user; labels come from the same component so they stay consistent (e.g. after a role is renamed).
  - **Other admin or app surfaces** that need to show or select a role (e.g. filters, reports, permission screens) can reuse the same component so the role set and labels are always in sync.
- **Allows the role set to be managed** (add, modify, delete):
  - **Add**: new roles can be defined (e.g. “Content Creator”, “Viewer”) and will appear in the Role dropdown and in the role list used by the app.
  - **Modify**: an existing role’s label, description, or permissions metadata can be updated; the Users page and any other consumer will show the new data.
  - **Delete**: a role can be removed from the configurable set. Behaviour for users who already have that role (e.g. remap to another role or block delete until no user has it) is defined at implementation level.

**Implementation notes**: The component can be backed by a config file, a database table, or an API. The contract expected by the Users page is typically: a list of role entries, each with at least an **id** (e.g. `program_manager`) and a **label** (e.g. “Program Manager”), and optionally a description or permission flags. The Users page (and the rest of the CMS) does not assume a fixed enum of roles; it renders whatever the Roles component provides. This way, projects can add, modify, or remove roles without changing the Users UI code.

---

## Users list page

- **Header**: Title “User Management”, subtitle “Manage user accounts and access credentials.”
- **Table**: Columns **Name**, **Email**, **Role**, **Status** (Active / Inactive / Suspended), **Last Login**, **Actions**.
- **Actions** (per row): **Edit** (pencil), **Reset password**, **Delete** (trash). Delete may be disabled for system or protected users.
- **Button**: “Add User” opens the user modal in **invite** mode.

---

## Add user (invite)

Clicking **Add User** opens a modal titled “Create New User” (or “Invite User”).

- **Invitation flow note** (optional): Short text explaining that an invitation email will be sent, the recipient will get a registration link, and after completing their profile the account will be activated.
- **Email** (required): Email address of the user to invite.
- **Role** (required): Select from the list of roles provided by the [Roles component](#21-roles-component-utility) (e.g. Super Admin, Program Manager, Advisor, Startup in the default set).
- **Startup** (conditional): If role is **Startup**, a dropdown appears to **Select Startup** (company). The list is filled from existing users with role Startup (company + email) and/or from other data sources (e.g. startups list in the app). Selecting a startup can pre-fill the email if the startup has an email. Required when role is Startup.
- **Name** and **Status** are hidden in invite mode; they are set when the user completes registration or when editing later.

On submit, the system creates a user record (or sends an invitation) with the given email and role; for Startup, `company` is stored. In the prototype, the new user is appended to the list and persisted (e.g. localStorage).

---

## Edit user

Clicking **Edit** on a row opens the same modal in **edit** mode.

- **Modal title**: “Edit User”; submit button label “Save User”.
- **Invitation note** is hidden.
- **Full Name** (required): Editable.
- **Email** (required): Editable.
- **Role** (required): Same dropdown as invite (roles from the [Roles component](#21-roles-component-utility)). Changing role to **Startup** shows the Startup dropdown; changing from **Startup** hides it and clears the startup association.
- **Startup** (conditional): Visible only when role is Startup; dropdown to select or change the associated startup (company).
- **Status** (required): Active, Inactive, or Suspended.

On submit, the existing user record is updated and the list is re-rendered; data is persisted (e.g. localStorage).

---

## Actions (reset password, delete)

- **Reset password**: Button (e.g. key icon) on the row. In the prototype it may show a confirmation and then generate a temporary password (and in production would send it by email or call an API). Used when a user has lost access.
- **Delete**: Button (trash icon). Confirmation dialog; on confirm the user is removed from the list and storage. Some users (e.g. system accounts) may have the delete button disabled.

---

## Data model and storage

- **Storage key** (prototype): `pmp_admin_users` — array of user objects.

- **User object** (per entry):

  - `id`: Unique identifier (e.g. number).
  - `name`: Full name.
  - `email`: Email address.
  - `role`: Role **id** from the [Roles component](#21-roles-component-utility) (e.g. `super_admin`, `program_manager`, `advisor`, `startup` in the default set). Valid values are those currently defined in the component; if a role is removed, existing users with that role need a migration or remap policy.
  - `status`: `active` | `inactive` | `suspended`.
  - `company`: Optional; used when `role === 'startup'` (startup/company name).
  - `lastLogin`: Optional string (e.g. “2 hours ago”) for display.

The list of roles itself (ids and labels) is managed by the Roles component (config, database, or API). In a production implementation, users and roles would typically be stored in a database and managed via an API; authentication (login, SSO, password reset) is handled by the [Authentication](./07_authentication.md) and [Emails](./06_emails.md) systems.

---

## References

- [01 – Overview](./01_overview.md) — CMS concepts and where Users fits in the admin.
- [07 – Authentication](./07_authentication.md) — Login, registration, activation, password recovery.
- [06 – Emails](./06_emails.md) — Email templates (e.g. invitation, activation).

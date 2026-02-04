# Authentication System

## Table of Contents

1. [Overview](#overview)
2. [Components](#components)
3. [Email Templates](#email-templates)
4. [Authentication Flows](#authentication-flows)
5. [Integration Guide](#integration-guide)

---

## Overview

The CMS provides a comprehensive Authentication System that enables external projects to implement a complete authentication flow. The system includes pre-built UI components and a set of email templates required for user authentication, registration, activation, and password recovery.

### Key Features

- **Pre-built Components**: Ready-to-use UI components for login, registration, password recovery, and SSO authentication
- **Email Templates**: Pre-configured email templates for the authentication flow
- **Standard Authentication**: Email/password-based authentication
- **SSO Support**: Single Sign-On integration with Google, Microsoft Teams, GitHub, and other providers
- **Email Activation**: User account activation via email verification
- **Password Recovery**: Secure password reset flow via email

### What the CMS Provides

The CMS Authentication System provides:

1. **UI Components**: Pre-configured React/TypeScript components for:
   - Login page (standard and SSO)
   - Registration page (standard and SSO)
   - Password recovery page
   - Email activation page

2. **Email Templates**: Pre-configured email templates in the Email System:
   - User activation email
   - Password reset email
   - Welcome email
   - Invitation email

3. **Authentication Functions**: Library functions for:
   - User registration
   - User login (standard and SSO)
   - Password reset request
   - Email verification
   - Token validation

---

## Components

The CMS provides pre-built authentication components that can be integrated into external projects.

### Login Component

**Component**: `LoginForm`

A complete login form component that supports:
- Standard email/password authentication
- SSO authentication (Google, Microsoft Teams, GitHub, etc.)
- Link to password recovery
- Form validation
- Error handling

#### Props

```typescript
interface LoginFormProps {
  onLogin: (credentials: { email: string; password: string }) => Promise<void>;
  onSSO: (provider: 'google' | 'teams' | 'github' | string) => Promise<void>;
  onForgotPassword?: () => void;
  redirectAfterLogin?: string;
  ssoProviders?: string[]; // List of enabled SSO providers
}
```

#### How It Works

The `LoginForm` component provides a complete UI for user authentication. It handles:
- Form validation for email and password fields
- Display of SSO provider buttons
- Error message display
- Loading states during authentication

The component calls the provided callback functions (`onLogin`, `onSSO`) when the user submits the form or clicks an SSO button. The actual authentication logic is implemented by the external project.

### Registration Component

**Component**: `RegistrationForm`

A complete registration form component that supports:
- Standard email/password registration
- SSO registration
- Terms & Conditions acceptance
- Form validation
- Password strength validation

#### Props

```typescript
interface RegistrationFormProps {
  onRegister: (data: {
    fullName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  onSSO: (provider: string) => Promise<void>;
  termsAndConditions: string; // Terms & Conditions content
  privacyPolicy?: string; // Privacy Policy content
  ssoProviders?: string[];
  invitationData?: {
    startupName?: string;
    programName?: string;
    invitationToken?: string;
  };
}
```

#### How It Works

The `RegistrationForm` component provides a complete UI for user registration. It handles:
- Form validation for all registration fields
- Password strength validation
- Password confirmation matching
- Terms & Conditions display with scroll detection
- Consent checkbox validation
- SSO registration buttons

The component calls the provided callback functions (`onRegister`, `onSSO`) when the user submits the form. The actual registration logic is implemented by the external project.

### Password Recovery Component

**Component**: `ForgotPasswordForm`

A password recovery form component that:
- Collects user email
- Sends password reset email
- Shows success message

#### Props

```typescript
interface ForgotPasswordFormProps {
  onRequestReset: (email: string) => Promise<void>;
  onBackToLogin?: () => void;
}
```

#### How It Works

The `ForgotPasswordForm` component provides a UI for password recovery. It handles:
- Email input validation
- Success message display after submission
- Link back to login page

The component calls the provided `onRequestReset` callback when the user submits their email. The actual password reset logic is implemented by the external project.

### Password Reset Component

**Component**: `ResetPasswordForm`

A form for setting a new password after clicking the reset link in email.

#### Props

```typescript
interface ResetPasswordFormProps {
  token: string; // Reset token from email link
  onReset: (token: string, newPassword: string) => Promise<void>;
}
```

---

## Email Templates

The CMS provides a set of pre-configured email templates for the authentication flow. These templates are stored in a dedicated configuration file and are automatically registered in the Email System during CMS bootstrap.

### Email Templates Configuration

The authentication email templates are defined in a dedicated configuration file within the CMS. This configuration file contains all the email templates required for the authentication flow:

- Template definitions with IDs, names, descriptions
- Default subject lines and message content
- Available variables for each template
- Default values for subject and message (for reset functionality)

### Bootstrap Registration

During CMS initialization (bootstrap), the Authentication System:

1. **Reads the configuration file**: The CMS reads the authentication email templates configuration file
2. **Loads templates into Email System**: The templates are automatically loaded into the Email System using `emailService.loadTemplates()`
3. **Templates become available**: Once loaded, the templates are immediately available for use in the authentication flow

This bootstrap process ensures that all authentication email templates are registered and ready to use when the CMS starts, without requiring manual template loading.

### Template Storage

The email templates configuration file is part of the CMS base configuration. It is separate from the main email templates configuration and is specifically dedicated to authentication-related emails.

**Important**: The authentication email templates are loaded automatically during CMS bootstrap. External projects do not need to manually load these templates - they are available immediately after CMS initialization.

### Authentication Email Templates

The following email templates are provided:

#### 1. User Activation Email

**Template ID**: `user_activation`

Sent when a user registers and needs to activate their account via email.

**Variables**:
- `user_name`: User's full name
- `activation_link`: Link to activate the account
- `expiration_time`: Time until the activation link expires

**Subject**: `Activate Your Account`

**How It Works**:

The Authentication System uses this template when a user registers. The system calls the Email System's `send()` function with the template ID and required variables. The Email System retrieves the template, replaces variables with actual values, and sends the email to the user.

#### 2. Password Reset Email

**Template ID**: `password_reset`

Sent when a user requests a password reset.

**Variables**:
- `user_name`: User's full name
- `reset_link`: Link to reset password
- `expiration_time`: Time until the reset link expires

**Subject**: `Reset Your Password`

**How It Works**:

The Authentication System uses this template when a user requests a password reset. The system generates a reset token, creates the reset link, and calls the Email System to send the password reset email with the template.

#### 3. Welcome Email

**Template ID**: `welcome_email`

Sent after a user successfully activates their account or completes registration.

**Variables**:
- `user_name`: User's full name
- `login_link`: Link to login page
- `dashboard_link`: Link to user dashboard

**Subject**: `Welcome to {{app_name}}`

**How It Works**:

The Authentication System uses this template after a user successfully activates their account or completes registration. The system calls the Email System to send a welcome email with links to login and dashboard.

#### 4. Invitation Email

**Template ID**: `user_invitation`

Sent when inviting a user to join the platform (e.g., startup invitation to join a program).

**Variables**:
- `user_name`: User's name (if known) or "User"
- `inviter_name`: Name of the person sending the invitation
- `invitation_link`: Link to accept invitation and register
- `program_name`: Name of the program (if applicable)
- `startup_name`: Name of the startup (if applicable)

**Subject**: `You've been invited to join {{program_name}}`

**How It Works**:

The Authentication System uses this template when sending invitations to users (e.g., startup invitations to join a program). The system generates an invitation token, creates the invitation link, and calls the Email System to send the invitation email with all relevant information.

### Integration with Email System

The Authentication System integrates with the CMS Email System to send emails. The integration works as follows:

1. **Templates are pre-loaded**: During CMS bootstrap, authentication email templates are automatically loaded into the Email System
2. **Authentication System calls Email System**: When authentication actions require email sending, the Authentication System calls the Email System's `send()` function
3. **Email System processes and sends**: The Email System retrieves the template, replaces variables, and sends the email using the configured email provider

The Authentication System does not directly send emails - it delegates to the Email System, which handles all email delivery logic.

---

## Authentication Flows

This section describes the complete authentication flows, including all interactions between the application, email system, and user.

### Flow 1: Standard Registration with Email Activation

This flow describes the complete process when a user registers with email and password.

```
┌─────────┐         ┌──────────┐         ┌─────────┐         ┌──────┐
│  User   │         │   App    │         │  Email  │         │ CMS  │
│         │         │          │         │ System  │         │      │
└────┬────┘         └────┬─────┘         └────┬────┘         └───┬──┘
     │                   │                    │                 │
     │ 1. Fill form      │                    │                 │
     ├──────────────────>│                    │                 │
     │                   │                    │                 │
     │ 2. Submit         │                    │                 │
     │    registration   │                    │                 │
     ├──────────────────>│                    │                 │
     │                   │                    │                 │
     │                   │ 3. Create user     │                 │
     │                   │    (inactive)      │                 │
     │                   │    Generate token  │                 │
     │                   ├─────────────────────────────────────>│
     │                   │                    │                 │
     │                   │ 4. Send activation │                 │
     │                   │    email           │                 │
     │                   ├───────────────────>│                 │
     │                   │                    │                 │
     │                   │                    │ 5. Send email  │
     │                   │                    │    to user     │
     │                   │                    ├────────────────>│
     │                   │                    │                 │
     │ 6. Receive email  │                    │                 │
     │<──────────────────┼────────────────────┼─────────────────┤
     │                   │                    │                 │
     │ 7. Click          │                    │                 │
     │    activation     │                    │                 │
     │    link           │                    │                 │
     ├──────────────────>│                    │                 │
     │                   │                    │                 │
     │                   │ 8. Validate token  │                 │
     │                   ├─────────────────────────────────────>│
     │                   │                    │                 │
     │                   │ 9. Activate user   │                 │
     │                   │    account         │                 │
     │                   ├─────────────────────────────────────>│
     │                   │                    │                 │
     │                   │ 10. Send welcome   │                 │
     │                   │     email          │                 │
     │                   ├───────────────────>│                 │
     │                   │                    │                 │
     │                   │                    │ 11. Send email  │
     │                   │                    │     to user     │
     │                   │                    ├────────────────>│
     │                   │                    │                 │
     │ 12. Receive       │                    │                 │
     │     welcome email │                    │                 │
     │<──────────────────┼────────────────────┼─────────────────┤
     │                   │                    │                 │
     │ 13. Redirect to   │                    │                 │
     │     login/dashboard│                   │                 │
     │<──────────────────┤                    │                 │
```

#### Step-by-Step Description

1. **User fills registration form**: User enters full name, email, password, and confirms password
2. **User submits registration**: Form is validated and submitted
3. **App creates user account**: 
   - User account is created with status "inactive"
   - Activation token is generated
   - Token is stored with expiration time (e.g., 24 hours)
4. **App requests activation email**: App calls Email System to send activation email
5. **Email System sends email**: Email is sent to user's email address with activation link
6. **User receives email**: User receives activation email in their inbox
7. **User clicks activation link**: User clicks the link which contains the activation token
8. **App validates token**: App validates the token with CMS (check expiration, validity)
9. **App activates user**: User account status is changed to "active"
10. **App requests welcome email**: App calls Email System to send welcome email
11. **Email System sends welcome email**: Welcome email is sent to user
12. **User receives welcome email**: User receives welcome email
13. **User is redirected**: User is redirected to login page or dashboard

### Flow 2: SSO Registration

This flow describes registration via Single Sign-On (Google, Microsoft Teams, GitHub, etc.).

```
┌─────────┐         ┌──────────┐         ┌──────────┐         ┌──────┐
│  User   │         │   App    │         │ SSO Prov │         │ CMS  │
│         │         │          │         │          │         │      │
└────┬────┘         └────┬─────┘         └────┬─────┘         └───┬──┘
     │                   │                    │                   │
     │ 1. Click SSO      │                    │                   │
     │    button         │                    │                   │
     ├──────────────────>│                    │                   │
     │                   │                    │                   │
     │                   │ 2. Redirect to     │                   │
     │                   │    SSO provider    │                   │
     │                   ├───────────────────>│                   │
     │                   │                    │                   │
     │ 3. Authenticate   │                    │                   │
     │    with SSO       │                    │                   │
     │<──────────────────┼────────────────────┤                   │
     │                   │                    │                   │
     │ 4. SSO callback   │                    │                   │
     │    with auth code │                    │                   │
     │<──────────────────┼────────────────────┤                   │
     │                   │                    │                   │
     │                   │ 5. Exchange code   │                   │
     │                   │    for user info   │                   │
     │                   ├───────────────────>│                   │
     │                   │                    │                   │
     │                   │ 6. Return user     │                   │
     │                   │    info            │                   │
     │                   │<───────────────────┤                   │
     │                   │                    │                   │
     │                   │ 7. Check if user   │                   │
     │                   │    exists          │                   │
     │                   ├───────────────────────────────────────>│
     │                   │                    │                   │
     │                   │ 8. User not found  │                   │
     │                   │    - Show Terms    │                   │
     │                   │    - Accept Terms  │                   │
     │                   │<───────────────────────────────────────┤
     │                   │                    │                   │
     │ 9. Accept Terms   │                    │                   │
     │    & Conditions   │                    │                   │
     ├──────────────────>│                    │                   │
     │                   │                    │                   │
     │                   │ 10. Create user    │                   │
     │                   │     account        │                   │
     │                   ├───────────────────────────────────────>│
     │                   │                    │                   │
     │                   │ 11. Send welcome  │                   │
     │                   │     email          │                   │
     │                   ├───────────────────>│                   │
     │                   │                    │                   │
     │ 12. Redirect to   │                    │                   │
     │     dashboard     │                    │                   │
     │<──────────────────┤                    │                   │
```

#### Step-by-Step Description

1. **User clicks SSO button**: User selects their SSO provider (Google, Teams, GitHub, etc.)
2. **App redirects to SSO provider**: User is redirected to SSO provider's authentication page
3. **User authenticates with SSO**: User logs in with their SSO provider credentials
4. **SSO provider redirects back**: SSO provider redirects back to app with authorization code
5. **App exchanges code for user info**: App exchanges authorization code for user information
6. **SSO provider returns user info**: SSO provider returns user email, name, etc.
7. **App checks if user exists**: App queries CMS to check if user already exists
8. **If user doesn't exist**: 
   - App shows Terms & Conditions
   - User must accept Terms & Conditions
9. **User accepts Terms**: User scrolls through and accepts Terms & Conditions
10. **App creates user account**: User account is created with SSO provider linked
11. **App sends welcome email**: Welcome email is sent via Email System
12. **User is redirected**: User is redirected to dashboard (already authenticated)

### Flow 3: Standard Login

This flow describes login with email and password.

```
┌─────────┐         ┌──────────┐         ┌──────┐
│  User   │         │   App    │         │ CMS  │
│         │         │          │         │      │
└────┬────┘         └────┬─────┘         └───┬──┘
     │                   │                   │
     │ 1. Enter          │                   │
     │    credentials    │                   │
     ├──────────────────>│                   │
     │                   │                   │
     │ 2. Submit login   │                   │
     ├──────────────────>│                   │
     │                   │                   │
     │                   │ 3. Validate       │
     │                   │    credentials    │
     │                   ├──────────────────>│
     │                   │                   │
     │                   │ 4. Check if       │
     │                   │    account is     │
     │                   │    active         │
     │                   ├──────────────────>│
     │                   │                   │
     │                   │ 5. Return auth    │
     │                   │    token          │
     │                   │<──────────────────┤
     │                   │                   │
     │ 6. Redirect to    │                   │
     │    dashboard      │                   │
     │<──────────────────┤                   │
```

#### Step-by-Step Description

1. **User enters credentials**: User enters email and password
2. **User submits login**: Form is submitted
3. **App validates credentials**: App sends credentials to CMS for validation
4. **CMS checks account status**: CMS verifies:
   - Credentials are correct
   - Account exists
   - Account is active (not pending activation)
5. **CMS returns auth token**: If valid, CMS returns authentication token
6. **User is redirected**: User is redirected to their dashboard

### Flow 4: SSO Login

This flow describes login via Single Sign-On.

```
┌─────────┐         ┌──────────┐         ┌──────────┐         ┌──────┐
│  User   │         │   App    │         │ SSO Prov │         │ CMS  │
│         │         │          │         │          │         │      │
└────┬────┘         └────┬─────┘         └────┬─────┘         └───┬──┘
     │                   │                    │                   │
     │ 1. Click SSO      │                    │                   │
     │    login button    │                    │                   │
     ├──────────────────>│                    │                   │
     │                   │                    │                   │
     │                   │ 2. Redirect to     │                   │
     │                   │    SSO provider    │                   │
     │                   ├───────────────────>│                   │
     │                   │                    │                   │
     │ 3. Authenticate   │                    │                   │
     │    with SSO       │                    │                   │
     │<──────────────────┼────────────────────┤                   │
     │                   │                    │                   │
     │ 4. SSO callback   │                    │                   │
     │    with auth code │                    │                   │
     │<──────────────────┼────────────────────┤                   │
     │                   │                    │                   │
     │                   │ 5. Exchange code   │                   │
     │                   │    for user info   │                   │
     │                   ├───────────────────>│                   │
     │                   │                    │                   │
     │                   │ 6. Return user    │                   │
     │                   │    info            │                   │
     │                   │<───────────────────┤                   │
     │                   │                    │                   │
     │                   │ 7. Find user by   │                   │
     │                   │    SSO ID          │                   │
     │                   ├───────────────────────────────────────>│
     │                   │                    │                   │
     │                   │ 8. Return user    │                   │
     │                   │    & auth token    │                   │
     │                   │<───────────────────────────────────────┤
     │                   │                    │                   │
     │ 9. Redirect to    │                    │                   │
     │    dashboard      │                    │                   │
     │<──────────────────┤                    │                   │
```

#### Step-by-Step Description

1. **User clicks SSO login**: User selects SSO provider
2. **App redirects to SSO provider**: User is redirected to SSO authentication page
3. **User authenticates**: User logs in with SSO provider
4. **SSO provider redirects back**: SSO provider redirects with authorization code
5. **App exchanges code**: App exchanges code for user information
6. **SSO provider returns user info**: User email, name, SSO ID are returned
7. **App finds user**: App queries CMS to find user by SSO ID or email
8. **CMS returns user and token**: If user exists and is active, CMS returns user data and auth token
9. **User is redirected**: User is redirected to dashboard

### Flow 5: Password Recovery

This flow describes the password reset process.

```
┌─────────┐         ┌──────────┐         ┌─────────┐         ┌──────┐
│  User   │         │   App    │         │  Email │         │ CMS  │
│         │         │          │         │ System │         │      │
└────┬────┘         └────┬─────┘         └────┬───┘         └───┬──┘
     │                   │                    │                 │
     │ 1. Enter email    │                    │                 │
     │    on forgot      │                    │                 │
     │    password page  │                    │                 │
     ├──────────────────>│                    │                 │
     │                   │                    │                 │
     │ 2. Submit email   │                    │                 │
     ├──────────────────>│                    │                 │
     │                   │                    │                 │
     │                   │ 3. Check if user  │                 │
     │                   │    exists         │                 │
     │                   ├─────────────────────────────────────>│
     │                   │                    │                 │
     │                   │ 4. Generate reset │                 │
     │                   │    token           │                 │
     │                   ├─────────────────────────────────────>│
     │                   │                    │                 │
     │                   │ 5. Send reset      │                 │
     │                   │    email           │                 │
     │                   ├───────────────────>│                 │
     │                   │                    │                 │
     │                   │                    │ 6. Send email   │
     │                   │                    │    to user      │
     │                   │                    ├────────────────>│
     │                   │                    │                 │
     │ 7. Receive email  │                    │                 │
     │<──────────────────┼────────────────────┼─────────────────┤
     │                   │                    │                 │
     │ 8. Click reset    │                    │                 │
     │    link           │                    │                 │
     ├──────────────────>│                    │                 │
     │                   │                    │                 │
     │                   │ 9. Validate token │                 │
     │                   ├─────────────────────────────────────>│
     │                   │                    │                 │
     │                   │ 10. Token valid   │                 │
     │                   │     - Show reset  │                 │
     │                   │       form        │                 │
     │                   │<─────────────────────────────────────┤
     │                   │                    │                 │
     │ 11. Enter new     │                    │                 │
     │     password      │                    │                 │
     ├──────────────────>│                    │                 │
     │                   │                    │                 │
     │ 12. Submit new    │                    │                 │
     │     password      │                    │                 │
     ├──────────────────>│                    │                 │
     │                   │                    │                 │
     │                   │ 13. Update        │                 │
     │                   │     password      │                 │
     │                   ├─────────────────────────────────────>│
     │                   │                    │                 │
     │                   │ 14. Invalidate    │                 │
     │                   │     token         │                 │
     │                   ├─────────────────────────────────────>│
     │                   │                    │                 │
     │ 15. Redirect to   │                    │                 │
     │     login         │                    │                 │
     │<──────────────────┤                    │                 │
```

#### Step-by-Step Description

1. **User enters email**: User enters email on forgot password page
2. **User submits**: Form is submitted
3. **App checks if user exists**: App queries CMS to verify user exists
4. **App generates reset token**: If user exists, reset token is generated with expiration (e.g., 1 hour)
5. **App requests reset email**: App calls Email System to send password reset email
6. **Email System sends email**: Email with reset link is sent to user
7. **User receives email**: User receives password reset email
8. **User clicks reset link**: User clicks link containing reset token
9. **App validates token**: App validates token with CMS (check expiration, validity)
10. **If token valid**: App shows password reset form
11. **User enters new password**: User enters and confirms new password
12. **User submits**: New password is submitted
13. **App updates password**: App updates user password in CMS
14. **App invalidates token**: Reset token is invalidated (one-time use)
15. **User is redirected**: User is redirected to login page

### Flow 6: Invitation Acceptance (Registration via Invitation)

This flow describes when a user is invited to join (e.g., startup invited to join a program) and must register.

```
┌─────────┐         ┌──────────┐         ┌─────────┐         ┌──────┐
│  User   │         │   App    │         │  Email │         │ CMS  │
│         │         │          │         │ System │         │      │
└────┬────┘         └────┬─────┘         └────┬───┘         └───┬──┘
     │                   │                    │                 │
     │                   │ 1. Admin/System   │                 │
     │                   │    sends          │                 │
     │                   │    invitation     │                 │
     │                   ├─────────────────────────────────────>│
     │                   │                    │                 │
     │                   │ 2. Generate       │                 │
     │                   │    invitation     │                 │
     │                   │    token          │                 │
     │                   │<─────────────────────────────────────┤
     │                   │                    │                 │
     │                   │ 3. Send           │                 │
     │                   │    invitation     │                 │
     │                   │    email          │                 │
     │                   ├───────────────────>│                 │
     │                   │                    │                 │
     │                   │                    │ 4. Send email  │
     │                   │                    │    to user      │
     │                   │                    ├────────────────>│
     │                   │                    │                 │
     │ 5. Receive        │                    │                 │
     │    invitation     │                    │                 │
     │    email          │                    │                 │
     │<──────────────────┼────────────────────┼─────────────────┤
     │                   │                    │                 │
     │ 6. Click          │                    │                 │
     │    invitation     │                    │                 │
     │    link           │                    │                 │
     ├──────────────────>│                    │                 │
     │                   │                    │                 │
     │                   │ 7. Validate       │                 │
     │                   │    invitation     │                 │
     │                   │    token          │                 │
     │                   ├─────────────────────────────────────>│
     │                   │                    │                 │
     │                   │ 8. Return         │                 │
     │                   │    invitation     │                 │
     │                   │    data           │                 │
     │                   │<─────────────────────────────────────┤
     │                   │                    │                 │
     │ 9. Show           │                    │                 │
     │    registration   │                    │                 │
     │    form with      │                    │                 │
     │    startup/program│                    │                 │
     │    info           │                    │                 │
     │<──────────────────┤                    │                 │
     │                   │                    │                 │
     │ 10. Fill form &   │                    │                 │
     │     accept Terms  │                    │                 │
     ├──────────────────>│                    │                 │
     │                   │                    │                 │
     │                   │ 11. Create user   │                 │
     │                   │     account        │                 │
     │                   ├─────────────────────────────────────>│
     │                   │                    │                 │
     │                   │ 12. Link user to  │                 │
     │                   │     startup/      │                 │
     │                   │     program        │                 │
     │                   ├─────────────────────────────────────>│
     │                   │                    │                 │
     │                   │ 13. Invalidate    │                 │
     │                   │     invitation     │                 │
     │                   │     token          │                 │
     │                   ├─────────────────────────────────────>│
     │                   │                    │                 │
     │                   │ 14. Send welcome  │                 │
     │                   │     email         │                 │
     │                   ├───────────────────>│                 │
     │                   │                    │                 │
     │                   │                    │ 15. Send email │
     │                   │                    │     to user     │
     │                   │                    ├────────────────>│
     │                   │                    │                 │
     │ 16. Receive       │                    │                 │
     │     welcome email │                    │                 │
     │<──────────────────┼────────────────────┼─────────────────┤
     │                   │                    │                 │
     │ 17. Redirect to   │                    │                 │
     │     dashboard     │                    │                 │
     │<──────────────────┤                    │                 │
```

#### Step-by-Step Description

1. **Admin/System sends invitation**: Admin or system creates invitation for user
2. **CMS generates invitation token**: Invitation token is generated and stored
3. **App requests invitation email**: App calls Email System to send invitation email
4. **Email System sends email**: Invitation email is sent to user
5. **User receives invitation**: User receives invitation email
6. **User clicks invitation link**: User clicks link containing invitation token
7. **App validates invitation**: App validates invitation token with CMS
8. **CMS returns invitation data**: CMS returns startup name, program name, etc.
9. **App shows registration form**: Registration form is shown with:
   - Startup name (non-editable)
   - Program name (non-editable)
   - Registration fields
   - Terms & Conditions
10. **User fills form and accepts Terms**: User completes registration and accepts Terms
11. **App creates user account**: User account is created
12. **App links user to startup/program**: User is linked to the startup/program from invitation
13. **App invalidates invitation token**: Invitation token is invalidated (one-time use)
14. **App sends welcome email**: Welcome email is sent via Email System
15. **Email System sends email**: Welcome email is sent to user
16. **User receives welcome email**: User receives welcome email
17. **User is redirected**: User is redirected to dashboard

---

## Integration Guide

### How the Authentication System Works with CMS

The Authentication System is integrated into the CMS and works in conjunction with the Email System:

#### System Initialization

1. **CMS Bootstrap**: When the CMS is initialized, the Authentication System is automatically set up
2. **Email Templates Loading**: During bootstrap, authentication email templates are read from the configuration file and loaded into the Email System
3. **Components Available**: Authentication UI components become available for use in external projects

#### Component Integration

External projects can import and use the authentication components:

- **Import Components**: Import the pre-built components from the CMS library
- **Provide Callbacks**: Implement callback functions that handle the actual authentication logic
- **Use Components**: Use the components in your pages/routes

The components handle all UI logic (validation, display, user interaction) and call your provided callbacks when authentication actions occur.

#### Email System Integration

The Authentication System integrates with the Email System as follows:

1. **Templates Pre-loaded**: Authentication email templates are automatically loaded during CMS bootstrap
2. **Email Sending**: When authentication actions require emails (activation, password reset, etc.), the Authentication System calls the Email System
3. **Email Delivery**: The Email System handles email delivery using the configured email provider

#### Interaction Flow

```
External Project
    │
    ├──> Uses Authentication Components (UI)
    │         │
    │         └──> Calls project callbacks
    │                   │
    │                   └──> Project implements auth logic
    │
    └──> Authentication System (CMS)
              │
              ├──> Manages authentication state
              │
              └──> Calls Email System
                        │
                        └──> Sends emails via configured provider
```

### What External Projects Need to Implement

External projects are responsible for:

1. **Authentication Logic**: Implementing the actual authentication logic (user creation, credential validation, token generation, etc.)
2. **User Management**: Managing user accounts, roles, and permissions
3. **Token Management**: Generating and validating activation tokens, reset tokens, invitation tokens
4. **SSO Integration**: Implementing SSO provider integration (OAuth flows, token exchange, etc.)
5. **Backend Services**: Implementing backend services that handle authentication requests

The CMS provides:
- UI components for authentication forms
- Email templates for authentication emails
- Integration with Email System for sending emails
- Component callbacks that external projects implement

---

## Best Practices

### Security

1. **Token Expiration**: Set appropriate expiration times for activation and reset tokens (e.g., 24 hours for activation, 1 hour for password reset)
2. **Token Invalidation**: Invalidate tokens after use (one-time use for password reset)
3. **Password Strength**: Enforce strong password requirements
4. **Rate Limiting**: Implement rate limiting on authentication operations
5. **HTTPS**: Always use HTTPS in production

### User Experience

1. **Clear Error Messages**: Provide clear, user-friendly error messages
2. **Email Instructions**: Include clear instructions in activation and reset emails
3. **Loading States**: Show loading states during authentication
4. **Success Feedback**: Provide feedback after successful actions

### Email Templates

1. **Customize Templates**: Customize email templates to match your brand
2. **Test Emails**: Test all email templates before going live
3. **Email Variables**: Ensure all required variables are provided when sending emails
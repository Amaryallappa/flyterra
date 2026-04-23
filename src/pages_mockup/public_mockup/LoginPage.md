# Login Page Mockup

## Purpose
Allows existing users (Farmers, Operators, Admins) to authenticate and access their respective dashboards.

## Functionality
- **Email Input**: Standard email field with validation.
- **Password Input**: Password field with a "Show/Hide" toggle.
- **Submit Button**: Triggers the login process.
- **Register Link**: Redirects new users to the registration page.

## Logic
- **Form Handling**: Uses `react-hook-form` and `zod` for validation.
- **Authentication**: Calls the `login` function from `AuthContext`.
- **Navigation**:
    - On success: Redirects to `/dashboard` (which then handles role-based redirection).
    - On failure: Displays a toast error message.
- **State**: `showPwd` (boolean) to toggle password visibility.

## API Interactivity
- **Auth**: Calls Supabase authentication.

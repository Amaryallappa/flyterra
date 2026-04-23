# Profile Page Mockup

## Purpose
Displays the farmer's personal account information and contact details.

## Functionality
- **User Identity**: Shows the full name (or username) and a role badge ("Farmer").
- **Account Details List**:
    - Username
    - Mobile Number (contact for coordination)
    - Account ID (internal reference)

## Logic
- **Data Source**: Accesses user data via `useAuth()` hook.
- **Badge**: Static "Farmer" badge for visual role confirmation.
- **Empty State**: Displays "—" for missing mobile numbers.

## API Interactivity
- Calls `useAuth` (Supabase Session).

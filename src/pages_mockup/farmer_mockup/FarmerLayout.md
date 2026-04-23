# Farmer Layout Mockup

## Purpose
The shell component that provides navigation, branding, and a consistent structure for all farmer-role pages.

## Functionality
- **Left Sidebar (Desktop)** / **Slide-over (Mobile)**:
    - Branding (AgriDrone logo).
    - User Identity Badge.
    - Navigation Menu:
        - Dashboard
        - My Fields
        - Book Service
        - Bookings
        - Profile
    - **Sign Out Button**: Ends the session and redirects to landing.
- **Top Header**:
    - Menu toggle (Mobile only).
    - Welcome message with user's name.
- **Main Content Area**: Container for child pages (via `<Outlet />`).

## Logic
- **Routing**: Uses `NavLink` for automatic "Active" state styling.
- **Mobile Menu**: `sidebarOpen` state (boolean) toggles visibility on small screens.
- **Authentication**: `handleLogout` calls `logout()` from `AuthContext` and navigate to `/`.
- **Layout Structure**: Flexbox container with `overflow-hidden` for the shell and `overflow-y-auto` for the main content.

## API Interactivity
- **Auth**: `useAuth().logout`

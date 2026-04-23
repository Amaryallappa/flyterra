# Admin Layout Mockup

## Purpose
The primary structural shell for the high-level administration portal, designed for managing global fleet and user data.

## Functionality
- **Sidebar (Dark Mode)**:
    - High-contrast sidebar using a dark background (`bg-gray-900`).
    - **Navigation Navigation**: Comprehensive links to Dashboard, Stations, Drones, Batteries, Operators, Farmers, Users, Bookings, and Settings.
    - **Brand Identity**: "Admin" label with "AD" logo.
- **Header**:
    - "Admin Dashboard" title.
    - Mobile menu trigger for smaller screens.
- **Role Identity**: Explicit "Admin Account" badge showing the logged-in username.

## Logic
- **Visual Distinction**: Uses a dark sidebar to visually differentiate the Admin role from Farmer (Light) and Operator (Blue-accented).
- **Responsive Handling**: Sidebar collapses into a mobile drawer with an overlay on smaller screens.
- **Session Management**: Integrates `useAuth` for sign-out and protected route context.

## API Interactivity
- Calls `useAuth` session.

# Operator Layout Mockup

## Purpose
Provides a consistent navigation shell for the Operator role, tailored for tablet and desktop use in the field.

## Functionality
- **Sidebar**:
    - Navigation: Dashboard, Field Verify, Jobs (Crucial), Drone Control.
    - Role Indicator: "Operator" badge.
    - User Identity: Name and logout button.
- **Header**:
    - Page Title (e.g., "Operator Dashboard").
    - Mobile menu button.

## Logic
- **Role-Based Nav**: Specific links for operator-only tasks (Field verification).
- **Responsive Shell**: Uses `fixed` positioning and `translate` transforms for the mobile sidebar.
- **Authentication**: `logout` logic redirects to the public landing page.

## API Interactivity
- Calls `useAuth` session.

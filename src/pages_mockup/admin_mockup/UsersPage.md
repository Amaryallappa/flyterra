# Admin Users Page Mockup

## Purpose
A global directory of all accounts in the system (Farmers, Operators, and Admins), providing a centralized point for access control.

## Functionality
- **Global User Table**: Lists all users with their Name, Username, Role (multi-colored badges), Mobile, Join Date, and Active Status.
- **Role Filtering**: Quick tabs to filter by Farmer, Operator, Admin, or All.
- **Access Control**:
    - **Activate/Deactivate**: Toggle a user's ability to log into the system.
    - **Protection**: The "Deactivate" button is disabled for other Admin accounts to prevent accidental lockouts.

## Logic
- **Data Integration**: Fetches from `adminApi.listUsers` with optional role parameter.
- **Status Visualization**: Uses `badge-green` for Farmers, `badge-blue` for Operators, and `badge-red` for Admins.
- **Account Security**: Only non-admin accounts can be deactivated from this view.

## API Interactivity
- **Admin**: `listUsers`, `activateUser`, `deactivateUser`.

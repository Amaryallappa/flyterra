# Admin Farmers Page Mockup

## Purpose
Enables administrators to view a directory of all registered farmers and navigate to their detailed profiles.

## Functionality
- **Farmers Table**: 
    - Lists ID, Name, Mobile Number, Join Date, and Account Status.
    - **Status Badge**: Green for "Active", Gray for "Inactive".
    - **Drill-down**: Click anywhere on a row to navigate to the detailed view for that specific farmer.
- **Counter**: Displays the total number of registered farmers at the top.

## Logic
- **Data Fetching**: Calls `adminApi.listUsers({ role: 'Farmer' })`.
- **Formatting**: Uses `date-fns` to format the `created_at` timestamp.
- **Navigation**: Uses `useNavigate` to go to `/admin/farmers/:id`.

## API Interactivity
- **Admin**: `adminApi.listUsers` (GET).

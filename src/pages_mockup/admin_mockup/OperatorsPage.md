# Admin Operators Page Mockup

## Purpose
A management interface for administrators to create, edit, deactivate, and delete operator accounts. It also handles assigning operators to specific base stations.

## Functionality
- **Operators Directory**: A table listing all operators with their name, username, contact info, assigned station, and status.
- **Add Operator**: A comprehensive modal to create new accounts, including personal details, login credentials (username/password), and initial station assignment.
- **Edit Operator**: Modal to update existing operator details or change their station.
- **Account Controls**:
    - **Toggle Status**: Quickly activate or deactivate an operator's login access.
    - **Delete**: Permanently remove an operator account (with confirmation).
- **Credential Management**: Allows resetting or setting a new password for the operator.

## Logic
- **Data Integration**: Fetches data from a joined Supabase query between `operators` and `accounts` tables to show profile and login status together.
- **Validation**: Uses `zod` for strict mobile number (10-digit Indian format) and username/password length checks.
- **Cross-Reference**: Filters station assignments to only show "Online" or active stations during creation.
- **Error Handling**: Specific toasts for common failures (e.g., local API not running).

## API Interactivity
- **Admin**: `createOperator`, `updateOperator`, `activateUser`, `deactivateUser`, `deleteOperator`, `listStations`.
- **Supabase**: Direct `from('operators').select(...)` query for the listing.

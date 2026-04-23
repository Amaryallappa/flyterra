# Admin Settings Page Mockup

## Purpose
Enables administrators to manage sensitive runtime configurations, specifically integrating payment gateways, without modifying environment variables or restarting the server.

## Functionality
- **Razorpay Configuration**:
    - **Key ID**: Input for the public Razorpay key (Test/Live).
    - **Key Secret**: Write-only input for the secret key.
    - **Status Indicators**: Green "Configured" badges if keys exist in the database; Yellow "Not set" otherwise.
    - **Audit Trail**: Shows the exact timestamp of the last configuration update.
- **Security**: The Key Secret is masked and never returned to the frontend; it is only used for write-operations.

## Logic
- **Encryption**: Keys are stored encrypted in the database (handled by the backend API).
- **Precedence**: Settings saved here override default values provided in `.env` files.
- **Immediate Effect**: Changes take effect for the next transaction without requiring a service reboot.

## API Interactivity
- **Admin**: `getRazorpaySettings`, `updateRazorpaySettings`.

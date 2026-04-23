# Register Page Mockup

## Purpose
Enables new farmers to create an account by providing their personal and contact details.

## Functionality
- **Full Name Input**: Name of the farmer.
- **Mobile Number Input**: Contact number with validation for Indian formats.
- **Email Input**: Standard email field.
- **Password & Confirm Password**: Two fields with "Show/Hide" toggle and matching validation.
- **Submit Button**: Triggers the registration process.

## Logic
- **Form Handling**: Powered by `react-hook-form` and `zod`.
- **Validation**:
    - Mobile number must match a 10-13 digit regex.
    - Password must be at least 8 characters.
    - "Confirm Password" must strictly match "Password".
- **Registration**: Calls the `/api/register` Netlify function (POST).
- **Navigation**: Redirects to `/login` after successful registration.

## API Interactivity
- **Register**: `POST /api/register`

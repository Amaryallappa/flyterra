# Book Service Page Mockup

## Purpose
A multi-step wizard for farmers to schedule a drone spray service for their verified fields.

## Functionality
- **Step 0: Select Fields**: Checkbox list of verified fields (must belong to the same base station).
- **Step 1: Spray Config & Date**: 
    - Date picker (minimum current date).
    - Cartridge configuration (Strict check: 30ml - 300ml per acre, or exactly 0ml. User cannot proceed if any cartridge is between 1-29ml or >300ml).
- **Step 2: Time Slot**: Shows available slots for the selected date. Slots from cancelled bookings are automatically released and shown as available.
- **Step 3: Confirm & Pay**: Summary of costs and "Pay Now" button via Razorpay.

## Logic
- **Wizard State**: Managed using a local `WizardState` object.
- **Slot Fetching**: Calls `bookingsApi.getSlots` when the user reaches the time slot step.
- **Payment Verification**:
    - Uses Razorpay CDN (loaded in `index.html`).
    - **Transactional Flow**: The booking is ONLY created in the DB *after* `bookingsApi.verifyPayment` succeeds. No temporary records are stored in the main `bookings` table beforehand.
- **Conflict Management**: Server-side re-check during verification.

## API Interactivity
- **Fields**: `fieldsApi.listVerified` (GET)
- **Bookings**: `bookingsApi.getSlots` (GET), `bookingsApi.create` (POST - returns Razorpay order only), `bookingsApi.verifyPayment` (POST - finalizes creation).

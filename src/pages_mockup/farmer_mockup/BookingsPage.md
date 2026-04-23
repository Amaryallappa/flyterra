# Bookings Page Mockup

## Purpose
A historical and management view of all spray bookings made by the farmer.

## Functionality
- **Status Tabs**: Filter bookings by All, Pending, Confirmed, In_Progress, Completed, or Cancelled.
- **Booking Card**:
    - Summary of ID, Status, Date/Time, Field Count, and Total Cost.
    - **Cancel Action**: Available for "Pending" or "Confirmed" bookings.
    - **View Details**: Link to the high-depth details page.

## Logic
- **Filtering**: Local filtering of the `bookings` array based on the active `tab` state.
- **Actions**: `cancel` mutation with query invalidation.
- **Display**: Uses `date-fns` for pretty-printing scheduling windows.

## API Interactivity
- **Bookings**: `bookingsApi.list` (GET), `bookingsApi.cancel` (POST)

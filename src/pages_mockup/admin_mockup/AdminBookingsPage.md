# Admin Bookings Page Mockup

## Purpose
A high-level management tool for administrators to oversee, filter, and manually intervene in any booking in the system.

## Functionality
- **Global Table**: Shows all bookings with Farmer, Station, Schedule, Cost, and Status.
- **Advanced Filtering**: Filter by Status, From Date, and To Date.
- **Administrative Actions**:
    - **Hold**: Temporarily pause a booking (with reason).
    - **Cancel**: Permanently cancel a booking (with reason).
    - **Release**: Resume a booking from "On_Hold" status.
- **Details Drawer**: Slide-out panel providing a deep dive into fields, cartridge configurations, and Razorpay transaction IDs.

## Logic
- **Conditional Actions**: Actions are disabled for "Completed" or "Cancelled" bookings.
- **Modals**: Uses `ActionModal` for confirms with optional text feedback (reasons).
- **Data Fetching**: React Query with dynamic parameters for real-time filtering.
- **Deep Linking**: Quick links from the drawer to the specific Base Station management page.

## API Interactivity
- **Admin**: `listBookings`, `cancelBooking`, `holdBooking`, `releaseBooking`.

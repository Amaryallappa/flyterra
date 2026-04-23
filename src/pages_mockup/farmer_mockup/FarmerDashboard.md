# Farmer Dashboard Mockup

## Purpose
Provides the farmer with a high-level overview of their agricultural operations, including field status and recent/active spray bookings.

## Functionality
- **Stats Overview**:
    - My Fields: Total count of fields added.
    - Verified Fields: Count of fields that have been verified by an operator.
    - Active Bookings: Count of bookings with "Confirmed" or "In_Progress" status.
    - Total Bookings: Lifetime count of bookings.
- **Quick Actions**:
    - Add New Field: Button to navigate to the field drawing page.
    - Book a Spray: Button to navigate to the booking wizard.
- **Active Sprays List**: Shows detailed cards for bookings that are currently in progress or confirmed.
- **Recent Bookings Table**: A list of the 5 most recent bookings with date, fields, cost, and status.

## Logic
- **Data Fetching**: Uses `@tanstack/react-query` to fetch fields from `fieldsApi.list` and bookings from `bookingsApi.list()`.
- **Filtering**:
    - Filters fields to count those where `is_verified` is true.
    - Filters bookings to identify "Active" ones.
- **Sorting**: Sorts bookings by `booking_id` descending to show the most recent ones.
- **Navigation**: Extensive use of `react-router-dom` `Link` components to drill down into details.

## API Interactivity
- **Fields**: `fieldsApi.list` (GET)
- **Bookings**: `bookingsApi.list` (GET)

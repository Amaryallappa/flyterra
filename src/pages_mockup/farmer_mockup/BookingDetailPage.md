# Booking Detail Page Mockup

## Purpose
A detailed summary of a specific booking, showing field information, costs, and chemical configurations.

## Functionality
- **Details Section**: Field names, total area, scheduled time, and price breakdown.
- **Cartridge Usage**: Breakdown of chemicals/ml per acre and total volume required.
- **Routing**: Uses `useParams` to fetch the specific booking details.

## Logic
- **Data Fetching**: Uses React Query to fetch the booking details based on the ID from the URL.
- **Status Display**: Shows the current service status (Confirmed, Completed, etc.).

## API Interactivity
- **Bookings**: `get` booking detail.

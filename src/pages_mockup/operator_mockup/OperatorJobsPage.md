# Operator Jobs Page Mockup

## Purpose
The core operational interface for managing spray bookings, launching missions, and monitoring field-by-field progress.

## Functionality
- **Job Tabs**:
    - **Today**: Active and upcoming jobs for the current day.
    - **Next 7 Days**: Planning view for the week ahead.
    - **All Bookings**: Historical archive of all station jobs.
- **Booking Card**:
    - **Confirm**: For "Pending" bookings to move them to "Confirmed".
    - **Launch**: For "Confirmed" bookings to start the drone mission.
    - **Release Hold**: Resumes a paused/held booking.
    - **GCS Live**: Link to the external Ground Control Station monitoring.
- **Operations Detail (Expandable)**:
    - Lists individual fields within a booking.
    - Displays current phase (Spraying, Refilling, Returning) and real-time progress percentage.
    - **Complete Booking**: Final button to mark the entire job as finished once all fields are done.

## Logic
- **State Transitions**:
    - Bookings follow a strict flow: Pending -> Confirmed -> In_Progress -> Completed.
    - Special "On_Hold" state for emergency pauses or weather delays.
- **Real-time Synchronization**:
    - Listens for `operation_update` WebSocket events to refresh progress without page reloads.
    - Polls the `getBookingOperations` endpoint every 10 seconds during active jobs.
- **Auto-Refresh**: Each tab has a standalone `refetchInterval` (30s to 60s).

## API Interactivity
- **Operator**: `getTodayJobs`, `getUpcomingJobs`, `getAllJobs`, `getBookingOperations`, `confirmBooking`, `launchBooking`, `releaseHold`, `completeBooking`.
- **Socket**: `operation_update`.

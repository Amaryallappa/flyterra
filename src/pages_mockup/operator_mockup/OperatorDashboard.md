# Operator Dashboard Mockup

## Purpose
A central hub for field operators to monitor daily jobs, pending verifications, and live drone positions.

## Functionality
- **Stats Row**:
    - Today's Jobs: Count of bookings scheduled for the current day.
    - Active Drones: Count of drones currently performing a mission (Status != "Idle").
    - Pending Verify: Count of fields awaiting operator verification.
- **Live Drone Map**:
    - Displays all drones on a satellite map.
    - Real-time movement and flight trails.
    - Popups show phase, altitude, speed, and battery level.
- **Today's Schedule List**: Horizontal list showing upcoming and active bookings for the day.

## Logic
- **Data Fetching**:
    - `operatorApi.getTodayJobs` for the schedule.
    - `operatorApi.listPendingFields` for the verification count.
- **Real-time Updates**:
    - Uses WebSocket (`drone_telemetry` event) to track all drones simultaneously.
    - Local state `drones` (Map) stores position and trail for each drone ID.
- **Filtering**: `activeDrones` is derived from the `drones` Map by checking `phase !== 'Idle'`.

## API Interactivity
- **Operator**: `operatorApi.getTodayJobs` (GET), `operatorApi.listPendingFields` (GET)
- **Real-time**: Socket.io event `drone_telemetry`.

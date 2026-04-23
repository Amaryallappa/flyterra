# Operator Drone Page Mockup

## Purpose
A management interface for operators to monitor and control the drones assigned to their specific base station.

## Functionality
- **Drones Table**:
    - Lists ID, Serial No, Type, and Status.
    - **Status Badge**: Color-coded (Active/In_Use/Maintenance).
    - **Open GCS Button**: Opens the Ground Control Station in a new tab.
- **Drone Detail Panel (Overlay)**:
    - Appears when a row is clicked.
    - Displays detailed specifications and a "Monitor" button.

## Logic
- **Data Filtering**:
    - The page first identifies the `assigned_base_station_id` from the logged-in user's profile.
    - It then filters the `allDrones` list to only show those belonging to that station.
- **Auto-Refresh**: Uses React Query `refetchInterval` to refresh the drone list every 30 seconds.
- **State**: `selectedDrone` (object) to manage the visibility of the detail panel.

## API Interactivity
- **Operator**: `operatorApi.getDrones` (GET).
- **External**: Opens a dynamic URL for the GCS (Liquid Labs/DroneGCS integration).

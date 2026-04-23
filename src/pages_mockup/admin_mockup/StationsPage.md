# Admin Stations Page Mockup

## Purpose
Primary interface for managing the physical infrastructure of the drone network. This includes base station enrollment, technical parameter tuning, and real-time health monitoring.

## Functionality
- **Base Station Directory**: Table showing ID, Serial No, Operational Status, Last Known Location (Lat/Lng), and Active Date.
- **Station Registration/Edit Modal**:
    - **Basic Info**: Serial No, Active Date, Status (Active/Maintenance/Offline).
    - **Operational Tuning**: Spray Speed (min/acre), Area cover per refill (acre/refill), Refill Time, Setup Buffer, and Price per acre.
    - **Operation Mode**: Toggle between "Spray" and "Spread" modes.
    - **Timing**: Daily start and end time window.
    - **Location Picker**: Integrated Leaflet map with satellite/hybrid/terrain layers to pinpoint exact station coordinates.
- **Real-time Health Dashboard (Modal)**:
    - **Connectivity**: Live indicator for Online/Offline status.
    - **Telemetry**: 
        - Water tank status (Empty/OK).
        - Direct flow rate (L/min).
        - **Cartridge Levels**: Visual progress bars showing exactly how many mL remain in up to 5 cartridges.
        - **Charging Slots**: Grid view of all battery slots showing occupancy, serialized battery ID, and individual charge percentage.
    - **Auto-Refresh**: Telemetry data refreshes every 5 seconds to match hardware broadcasts.

## Logic
- **Map Interaction**: Uses `react-leaflet` for visual coordinate picking.
- **State Selection**: Managed by `react-hook-form` with explicit type casting for numeric payload fields.
- **Telemetry Integration**: Fetches from `adminApi.getStationHealth` with a 5-second polling interval (`refetchInterval`).
- **Dynamic Visuals**: Color-coded progress bars for cartridges and battery charge (Green > 50%, Yellow > 20%, Red < 20%).

## API Interactivity
- **Admin**: `listStations`, `createStation`, `updateStation`, `deleteStation`, `getStationHealth`.

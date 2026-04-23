# Admin Batteries Page Mockup

## Purpose
Detailed tracking of the high-value battery assets, including lifecycle monitoring and live telemetry when active on a drone.

## Functionality
- **Battery Inventory**: Table showing Serial No, Assigned Station, Min Voltage, Total Life Cycles, and Status.
- **Battery Management Modal**:
    - **Enrollment**: Set Serial No, Active Date, Min Voltage, and Total Life Cycles.
    - **Assignment**: Assign battery to a specific Base Station.
    - **Status Control**: Active, Charging, In_Use, Retired.
- **Battery Detail Dashboard (Modal)**:
    - **Lifecycle Tracking**: Progress bar showing `used_cycles` vs `total_life_cycles` with color-coded health (Green < 60%, Yellow < 85%, Red > 85%).
    - **Live Telemetry**: 
        - Pack Voltage and Current Draw (Amps).
        - Remaining percentage with color-coded bar.
        - **Cell Voltages**: Individual cell bar charts (up to 6 cells) with 3-decimal precision (e.g., 3.842V).
        - **Min/Max/Delta**: Automatic calculation of voltage spread between cells.
    - **Location**: Shows which Station or Drone the battery is currently on.
    - **Auto-Refresh**: Refreshes telemetry every 15 seconds.

## Logic
- **Health Calculation**: Determines "used percentage" based on rated life cycles.
- **Cell Normalization**: Scales individual cell bars based on the battery's defined min voltage and a standard 4.2V max.
- **Telemetry Polling**: Uses `react-query` `refetchInterval` for live voltage updates.

## API Interactivity
- **Admin**: `listBatteries`, `getBatteryDetail`, `createBattery`, `updateBattery`, `deleteBattery`, `listStations`.

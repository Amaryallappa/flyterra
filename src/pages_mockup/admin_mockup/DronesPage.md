# Admin Drones Page Mockup

## Purpose
System-wide inventory and configuration management for the drone fleet. Administrators can add new drones, configure technical flight parameters, and assign them to base stations.

## Functionality
- **Drones Fleet List**: Table showing ID, Serial No, Assigned Station, Operation Type, Pricing, and Status.
- **Drone Configuration Modal**:
    - **Basic Info**: Serial No, Active Date.
    - **Technical Parameters**: Minutes per acre (speed), Setup buffer, Refill time, Max acres per tank.
    - **Business Rules**: Price per acre, Operation Mode (Spray/Spread/Both), Daily operational window (start/end times).
    - **Connectivity**: Companion PC URL (Cloudflare Tunnel) and Video URL override.
- **Monitoring Tools**:
    - **GCS Live**: Quick link to open the Ground Control interface.
    - **Detail Panel**: Overlay showing granular drone specs and health status.
- **Fleet Management**: Standard Edit and Delete (with confirmation) actions.

## Logic
- **Data Coercion**: Strictly converts form inputs (strings) to numbers or nulls as required by the backend Pydantic models.
- **Auto-Derivation**: Video streams are automatically derived from the Companion PC URL unless an override is provided.
- **Status Badges**: Visual indicator of fleet readiness (Active, In_Use, Maintenance, Retired).
- **CRUD**: Full Create/Read/Update/Delete lifecycle management.

## API Interactivity
- **Admin**: `listDrones`, `listStations`, `createDrone`, `updateDrone`, `deleteDrone`.

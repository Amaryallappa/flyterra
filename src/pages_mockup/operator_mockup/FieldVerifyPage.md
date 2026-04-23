# Field Verification Page Mockup

## Purpose
The primary interface for operators to verify farmer-submitted fields, generate QGC boundary files, and upload mission plans.

## Functionality
- **Pending/Verified Tabs**: Filter fields by their verification state.
- **Field Card (Expandable)**:
    - Displays Field/Farmer info and a mini satellite map.
    - **Download Boundary**: Generates a `.waypoints` file in QGroundControl format (WPL 110) based on the farmer's drawn polygon.
    - **Base Station Assignment**: Dropdown to select which station will serve this field.
    - **Mission Uploads**: File inputs for 3 mandatory plans (`Base -> Field`, `Field -> Base`, `Polygon Spray`) and 1 optional (`Exclusion`).
    - **Verification Submission**: Button to finalize and enable the field for booking.

## Logic
- **Data Normalization**: `toLatLng` helper ensures coordinates from different sources are compatible with Leaflet.
- **Waypoint Generation**: Custom logic to format a plain-text `QGC WPL 110` file in the browser for immediate download.
- **Form Handling**:
    - Uses `FormData` for multi-file upload.
    - Strict validation: Base Station and 3 mission files are mandatory.
- **State**: `expanded` (boolean) to manage card detail visibility.

## API Interactivity
- **Operator**: `operatorApi.listPendingFields` (GET), `operatorApi.listVerifiedFields` (GET), `operatorApi.listStations` (GET), `operatorApi.verifyField` (POST - multipart/form-data).

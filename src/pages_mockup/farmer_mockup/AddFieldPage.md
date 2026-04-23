# Add Field Page Mockup

## Purpose
Allows farmers to register a new field by drawing its boundary on a satellite map and providing crop details.

## Functionality
- **Map Interaction**:
    - Satellite view (Google Satellite).
    - **Polygon Drawing**: Tool to mark field corners manually.
    - **Real-time Area**: Displays the calculated acreage as the user draws/edits vertices.
- **Field Details Form**:
    - Field Name (e.g., "North Farm Block A")
    - Crop Type (e.g., "Rice", "Wheat")
- **Submission**: Button to save the field for operator verification.

## Logic
- **Map Library**: Uses `react-leaflet` and `@geoman-io/leaflet-geoman-free`.
- **Area Calculation**: Custom `calculateArea` function using planar approximation for small agricultural fields. Updates on `pm:create`, `pm:edit`, and `pm:dragend` events.
- **Form Handling**: `react-hook-form` and `zod`.
- **Validation**: Minimum 3 points required for a valid field boundary.
- **Geolocation**: Attempts to center the map on the user's current location on load.

## API Interactivity
- **Fields**: `fieldsApi.create` (POST)

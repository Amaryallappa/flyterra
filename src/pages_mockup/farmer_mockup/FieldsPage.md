# Fields Page Mockup

## Purpose
Management interface for a farmer's registered fields. Shows verification status and provides an entry point to field addition and booking.

## Functionality
- **Fields List**: Displayed in a grid of cards.
- **Field Card**:
    - Shows Field Name, Crop Type, and Area (Acres).
    - **Verification Badge**: Indicates if the field is "Verified" or "Pending Verification".
    - **Book Spray Button**: Only visible/active for verified fields.
- **Add Field CTA**: High-visibility button to add the first field if none exist.
- **Delete Action**: Trash icon to remove a field (with confirmation).

## Logic
- **CRUD Operations**:
    - **List**: Fetches fields via `fieldsApi.list`.
    - **Delete**: Uses a mutation calling `fieldsApi.delete`. Invalidate `['fields']` query on success.
- **Conditional Rendering**:
    - Shows a "No fields" empty state if the list is empty.
    - "Book Spray" button is only rendered if `f.is_verified` is true.

## API Interactivity
- **Fields**: `fieldsApi.list` (GET), `fieldsApi.delete` (DELETE)

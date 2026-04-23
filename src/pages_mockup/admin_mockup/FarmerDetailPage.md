# Admin Farmer Detail Page Mockup

## Purpose
A comprehensive management view for a specific farmer, allowing administrators to audit bookings, manage field missions, and adjust wallet balances.

## Functionality
- **Profile Summary**: Displays full name, username, contact info, and joining date.
- **Wallet Management**: 
    - Real-time balance display.
    - **In-place Editing**: Administrators can manually update the wallet balance for corrections or manual credits.
- **Bookings Tab**:
    - Filterable table of all bookings by this farmer.
    - **Actions**: Place On Hold or Release bookings directly from the list.
- **Fields Tab**:
    - List of all fields with verification status.
    - **Station Re-assignment**: Change which Base Station is assigned to a field.
    - **Mission File Management**: 
        - Download existing mission files (`.plan`, `.waypoints`).
        - Re-upload or update mission files (Base->Field, Field->Base, etc.).
        - Indicates "Missions Ready" with a blue badge if files exist.

## Logic
- **Data Model**: Fetches a nested `FarmerDetail` object containing `bookings` and `fields`.
- **In-place Editing**: Uses local state `editing` and `val` to handle wallet updates without a separate form.
- **File Downloads**: Uses `adminApi.getMissionDownloadUrl` to fetch secure Supabase storage links.
- **Multipart Uploads**: Uses `FormData` for field mission re-uploads.

## API Interactivity
- **Admin**: `getFarmerDetail`, `updateFarmerWallet`, `holdBooking`, `releaseBooking`, `updateFieldStation`, `uploadFieldMissions`, `getMissionDownloadUrl`, `listStations`.

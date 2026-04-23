# Admin Dashboard Mockup

## Purpose
The primary monitoring center for system administrators to track global asset utilization, revenue, and live operation counts.

## Functionality
- **Asset Count Cards**:
    - **Stations**: Active vs. Total count.
    - **Drones**: Active vs. Total count.
    - **Batteries**: Total inventory count.
    - **Users**: Breakdown of Farmers and Operators.
- **Live Status Cards**: 
    - **Active Operations**: Real-time count of drones currently in flight.
    - **In-Progress Bookings**: Count of total bookings currently being executed.
- **Period Performance**:
    - Detailed grid showing Bookings, Completed, Cancelled, and Revenue for **Today**, **This Week**, and **This Month**.

## Logic
- **Data Source**: Fetches all metrics from a single `adminApi.getDashboard` call.
- **Visuals**: Uses `lucide-react` icons and color-coded backgrounds for differentiated metrics.
- **Empty States**: Revenue defaults to ₹0 if null.

## API Interactivity
- **Admin**: `adminApi.getDashboard` (GET).

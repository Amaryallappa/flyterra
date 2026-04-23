# Admin Drone Live Monitor Mockup (GCS)

## Purpose
A standalone, high-performance Ground Control Station (GCS) interface for real-time drone monitoring and manual flight command intervention.

## Functionality
- **Flight Data Strip**: Multi-cell header showing live Altitude, Vertical Speed, Horizontal Speed, Yaw, GPS Satellites, and dual Battery levels.
- **Flight Control Panel**:
    - **Safety**: Arm/Disarm and Emergency Kill buttons.
    - **Navigation**: Takeoff, Land, Return-to-Launch (RTL), and Start Mission commands.
    - **Mode Selection**: Switch between Guided, Loiter, Auto, and Manual modes.
    - **Sliders**: Real-time adjustment of Flight Speed and Altitude.
- **HUD (Heads-Up Display)**: Canvas-based artificial horizon and compass for spatial awareness.
- **Mission Planner**:
    - Interactive map for viewing and editing waypoints.
    - Waypoint table listing Latitude, Longitude, Altitude, and Command Type.
    - **Tools**: Clear Mission, Upload/Download Mission files, and Draw Polygon.
- **Visuals**: 
    - **Live Video**: HLS stream integrated into the right-side panel with latency monitoring.
    - **Real-time Logs**: Scrolly console showing INFO, WARN, and ERROR messages from the drone's telemetry link.

## Logic
- **Direct Link**: Connects directly to the drone's companion PC (via Cloudflare Tunnels) using WebSockets or REST.
- **Status Indicators**: Color-coded "Pills" for System Health, GPS Lock, and Battery status.
- **Manual Overrides**: Sliders and buttons trigger immediate MAVLink-equivalent commands to the flight controller.

## Interactivity
- **Protocols**: REST API calls to the companion PC, HLS for video, and LocalStorage for mission persistence.

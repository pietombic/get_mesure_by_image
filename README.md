# Get Measure by Image 📏📸

An interactive web application that allows you to measure real-world distances between objects in a photo using a physical marker (ArUco) as a scale reference.

## How it Works

The application uses computer vision to calibrate the scene:

1.  **ArUco Marker Detection**: The app automatically identifies a standard ArUco marker in your uploaded image.
2.  **Perspective Rectification**: By clicking "Rectify Perspective", the app uses OpenCV.js to transform the image, making the marker a perfect square and fixing any camera tilt. This ensures that the pixel-to-millimeter ratio is uniform across the plane.
3.  **Real-world Scaling**: By providing the physical size of the marker (in mm), the app calculates the exact scale of the image.
4.  **Interactive Measurement**: Click two points on the rectified image to see the precise distance between them in millimeters.

## Tech Stack

*   **React + Vite**: For a fast and modern frontend.
*   **OpenCV.js**: Advanced perspective transformations.
*   **JS-Aruco2**: Lightweight ArUco marker detection library.
*   **Vanilla CSS**: Custom professional-grade aesthetics.

##  Installation & Usage

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your system.

### 2. Setup
Clone the repository and install dependencies:
```bash
# Clone the repository
git clone https://github.com/pietombic/get_mesure_by_image

# Enter the directory
cd get_mesure_by_image

# Install dependencies
npm install
```

### 3. Run Locally
Start the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

### 4. How to Measure
1.  Print an **ArUco marker** and place it on the same plane as the object you want to measure.
2.  Take a photo and upload it to the app.
3.  Enter the **physical size** of the marker (e.g., 50 for a 5cm marker).
4.  Click **"Rectify Perspective"** to fix any camera distortion.
5.  Click on the start and end points of the object you want to measure.
6.  The **Real Distance** will appear below the image.

---
Created by [pietrombaccini](https://github.com/pietrotombaccini)
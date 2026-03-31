import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const markerSizeRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Storage for background image and detected markers for redrawing
  const currentImage = useRef(null);
  const currentMarkers = useRef([]);

  const handleUpload = () => {
    const file = fileInputRef.current.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        currentImage.current = img;
        setPoints([]); // Reset points on new image
        detectAndDraw();
        setImageLoaded(true);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const detectAndDraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = currentImage.current;
    if (!img) return;

    canvas.width = img.width;
    canvas.height = img.height;

    // 1. Draw Image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 2. Detect & Draw Markers
    if (window.AR) {
      const detector = new window.AR.Detector({
        dictionaryName: 'ARUCO',
        maxHammingDistance: 2
      });
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const markers = detector.detect(imageData);
      currentMarkers.current = markers;

      console.log("Detected markers:", markers);
      drawMarkers(ctx, markers);
    }
  };

  const drawMarkers = (ctx, markers) => {
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#40ff00";
    ctx.font = "bold 24px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#40ff00";

    markers.forEach(marker => {
      const corners = marker.corners;
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillText("ID: " + marker.id, corners[0].x, corners[0].y - 12);
    });
  };

  const calculateDistance = () => {
    if (points.length !== 2 || currentMarkers.current.length === 0) return null;
    
    // 1. Get Marker Physical Size (mm)
    const markerSizeMM = parseFloat(markerSizeRef.current.value);
    if (!markerSizeMM || isNaN(markerSizeMM)) return "Insert Marker Size";

    // 2. Get Marker Pixel Size (Average side length)
    const marker = currentMarkers.current[0];
    const corners = marker.corners;
    const side1 = Math.sqrt(Math.pow(corners[0].x - corners[1].x, 2) + Math.pow(corners[0].y - corners[1].y, 2));
    const side2 = Math.sqrt(Math.pow(corners[1].x - corners[2].x, 2) + Math.pow(corners[1].y - corners[2].y, 2));
    const markerSidePX = (side1 + side2) / 2;

    // 3. Pixel-to-MM Ratio
    const pxToMM = markerSizeMM / markerSidePX;

    // 4. Distance between points in pixels
    const dx = points[0].x - points[1].x;
    const dy = points[0].y - points[1].y;
    const distPX = Math.sqrt(dx * dx + dy * dy);

    // 5. Final Distance in MM
    return (distPX * pxToMM).toFixed(2);
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage.current) return;
    const ctx = canvas.getContext('2d');

    // Clear and Redraw Base Image
    ctx.drawImage(currentImage.current, 0, 0, canvas.width, canvas.height);

    // Redraw Markers
    drawMarkers(ctx, currentMarkers.current);

    // Draw Points and Line
    ctx.fillStyle = "red";
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;

    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.font = "bold 20px Inter, sans-serif";
      ctx.fillText(`P${index + 1}`, point.x + 12, point.y + 12);
    });

    if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
    }
  };

  useEffect(() => {
    redraw();
    if (points.length > 0) {
      console.log("Points Coordinates:", points);
    }
  }, [points]);

  const rectifyImage = () => {
    if (!window.cv || currentMarkers.current.length === 0) return;
    const cv = window.cv;
    const canvas = canvasRef.current;
    
    // 1. Prepare OpenCV Mats
    const src = cv.imread(canvas);
    const dst = new cv.Mat();
    const marker = currentMarkers.current[0]; // Case 1: First marker
    const corners = marker.corners;

    // 2. Define source and destination points
    // Source: detected marker corners (TL, TR, BR, BL)
    const srcPtsArray = [
      corners[0].x, corners[0].y,
      corners[1].x, corners[1].y,
      corners[2].x, corners[2].y,
      corners[3].x, corners[3].y
    ];
    const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, srcPtsArray);

    // Destination: a square representative of the marker's real shape
    // We center it and give it a reasonable size based on the detection
    const side = Math.sqrt(
      Math.pow(corners[0].x - corners[1].x, 2) + Math.pow(corners[0].y - corners[1].y, 2)
    );
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const d = side / 2;

    const dstPtsArray = [
      centerX - d, centerY - d,
      centerX + d, centerY - d,
      centerX + d, centerY + d,
      centerX - d, centerY + d
    ];
    const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, dstPtsArray);

    // 3. Compute Perspective Matrix and Warp
    const dsize = new cv.Size(canvas.width, canvas.height);
    const M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    // 4. Update Canvas with Processed Image
    cv.imshow(canvas, dst);

    // 5. Update Storage and Clean up
    const rectifiedImg = new Image();
    rectifiedImg.src = canvas.toDataURL();
    rectifiedImg.onload = () => {
      currentImage.current = rectifiedImg;
      setPoints([]); // Reset points as world changed
      // Redetect markers on rectified image to update positions
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (window.AR) {
        const detector = new window.AR.Detector({ dictionaryName: 'ARUCO', maxHammingDistance: 2 });
        currentMarkers.current = detector.detect(imageData);
        console.log("Post-rectification markers detected");
      }
      redraw();
    };

    src.delete(); dst.delete(); M.delete(); srcPts.delete(); dstPts.delete();
  };

  const handleCanvasClick = (e) => {
    if (!imageLoaded) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Scale coordinates from CSS space to Canvas internal space
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    setPoints(prev => {
      if (prev.length >= 2) {
        return [{ x, y }]; // Start over after 2 points
      } else {
        return [...prev, { x, y }];
      }
    });
  };

  return (
    <>
      <section id="center">
        <label htmlFor="image">Upload an image</label>
        <input
          type="file"
          id="image"
          accept="image/*"
          ref={fileInputRef}
        />
        <label htmlFor="markerSize">Marker Size (mm)</label>
        <input type="number" id="markerSize" ref={markerSizeRef} />
        <button onClick={handleUpload}>Upload</button>
        <button 
          onClick={rectifyImage} 
          disabled={!imageLoaded || currentMarkers.current.length === 0}
        >
          Rectify Perspective
        </button>

        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ cursor: imageLoaded ? 'crosshair' : 'default' }}
          ></canvas>
        </div>

        {points.length > 0 && (
          <div className="points-info">
            Selected points: {points.length}/2
            {points.length === 2 && (
              <div className="distance-result">
                Real Distance: <strong>{calculateDistance()} mm</strong>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  )
}

export default App

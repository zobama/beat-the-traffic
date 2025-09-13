class LionsGateTrafficApp {
    constructor() {
        this.webcamURL = 'https://images.drivebc.ca/bchighwaycam/pub/cameras/18.jpg';
        this.delayURL  = 'https://www.th.gov.bc.ca/ATIS/lgcws/images/lions_gate/atis_delay.gif';
        this.queueURL  = 'https://www.th.gov.bc.ca/ATIS/lgcws/images/lions_gate/queue_map.gif';

        this.updateInterval = 60000; // 60 seconds
        this.timer = null;
        
        // Add canvas for image analysis
        this.canvas = null;
        this.ctx = null;

        this.init();
        window.trafficApp = this;
    }

    init() {
        this.setupCanvas();                // NEW: setup canvas for analysis
        this.setupEventListeners();
        this.setupImageErrorHandlers();   // set handlers once
        this.fetchAllData();
        this.startAutoUpdate();

    }
    

sampleImageColors() {
    const webcamImage = document.getElementById('webcamImage');
    if (!webcamImage || !webcamImage.complete) {
        console.log('Image not loaded');
        return;
    }

    this.canvas.width = webcamImage.naturalWidth || webcamImage.width;
    this.canvas.height = webcamImage.naturalHeight || webcamImage.height;
    this.ctx.drawImage(webcamImage, 0, 0);

    const width = this.canvas.width;
    const height = this.canvas.height;
    
    console.log(`=== LOOKING FOR TEAL TRAFFIC LIGHTS ===`);
    console.log(`Target color: RGB(81, 214, 208)`);
    console.log(`Image size: ${width}x${height}`);
    
    // Find pixels similar to our target teal color
    let tealPixels = [];
    const targetR = 81, targetG = 214, targetB = 208;
    
    for (let y = Math.floor(height * 0.1); y < Math.floor(height * 0.4); y += 5) {
        for (let x = Math.floor(width * 0.1); x < Math.floor(width * 0.9); x += 5) {
            try {
                const pixel = this.ctx.getImageData(x, y, 1, 1).data;
                const [r, g, b] = pixel;
                
                // Calculate color distance from target
                const colorDistance = Math.sqrt(
                    Math.pow(r - targetR, 2) + 
                    Math.pow(g - targetG, 2) + 
                    Math.pow(b - targetB, 2)
                );
                
                // Also check for general teal characteristics
                const isTealish = (
                    g > 150 && b > 150 && g > r + 50 && b > r + 50 && Math.abs(g - b) < 50
                );
                
                if (colorDistance < 80 || isTealish) {
                    const side = x < width/2 ? 'LEFT' : 'RIGHT';
                    tealPixels.push({x, y, r, g, b, distance: colorDistance, side});
                }
            } catch (e) {
                continue;
            }
        }
    }
    
    // Group by side and show results
    const leftTeal = tealPixels.filter(p => p.side === 'LEFT');
    const rightTeal = tealPixels.filter(p => p.side === 'RIGHT');
    
    console.log(`\n=== TEAL DETECTION RESULTS ===`);
    console.log(`Left side teal pixels: ${leftTeal.length}`);
    console.log(`Right side teal pixels: ${rightTeal.length}`);
    
    if (leftTeal.length > 0) {
        console.log('Sample LEFT teal pixels:');
        leftTeal.slice(0, 5).forEach((p, i) => {
            console.log(`  ${i+1}. (${p.x},${p.y}): RGB(${p.r},${p.g},${p.b}) - Distance: ${p.distance.toFixed(1)}`);
        });
    }
    
    if (rightTeal.length > 0) {
        console.log('Sample RIGHT teal pixels:');
        rightTeal.slice(0, 5).forEach((p, i) => {
            console.log(`  ${i+1}. (${p.x},${p.y}): RGB(${p.r},${p.g},${p.b}) - Distance: ${p.distance.toFixed(1)}`);
        });
    }
    
    // Show the closest matches to our target color
    const closest = tealPixels.sort((a, b) => a.distance - b.distance).slice(0, 10);
    console.log('\nClosest matches to RGB(81, 214, 208):');
    closest.forEach((p, i) => {
        console.log(`${i+1}. (${p.x},${p.y}) ${p.side}: RGB(${p.r},${p.g},${p.b}) - Distance: ${p.distance.toFixed(1)}`);
    });
}

    // NEW: Setup hidden canvas for image analysis
    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.display = 'none';
        document.body.appendChild(this.canvas);
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.fetchAllData();
            });
        }

        // Debug toggle
        const debugToggle = document.getElementById('debugToggle');
        if (debugToggle) {
            debugToggle.addEventListener('click', () => {
                this.toggleDebugInfo();
            });
        }
    }

    fetchAllData() {
    this.showLoading();

    try {
        const ts = Date.now();
        const webcamImage = document.getElementById('webcamImage');
        const delayImage = document.getElementById('delayImage');
        const queueImage = document.getElementById('queueImage');

        // For analysis, we need to load the webcam image through a CORS proxy
        if (webcamImage) {
            // Display version (might have CORS issues but shows the image)
            webcamImage.referrerPolicy = 'no-referrer';
            webcamImage.style.opacity = '0.7';
            webcamImage.src = `${this.webcamURL}?t=${ts}`;
            
            // Analysis version (through CORS proxy)
            this.loadImageForAnalysis(`${this.webcamURL}?t=${ts}`);
        }

        if (delayImage) {
            delayImage.referrerPolicy = 'no-referrer';
            delayImage.style.opacity = '0.7';
            delayImage.src = `${this.delayURL}?t=${ts}`;
        }

        if (queueImage) {
            queueImage.referrerPolicy = 'no-referrer';
            queueImage.style.opacity = '0.7';
            queueImage.src = `${this.queueURL}?t=${ts}`;
        }

        this.updateLastUpdated();

        // Hide loading when images load
        const done = () => this.hideLoading();
        let loadFired = false;

        [webcamImage, delayImage, queueImage].forEach(img => {
            if (!img) return;
            const onloadOnce = () => {
                if (!loadFired) {
                    loadFired = true;
                    done();
                }
                img.style.opacity = '1';
                img.removeEventListener('load', onloadOnce);
            };
            img.addEventListener('load', onloadOnce);
        });

        setTimeout(() => {
            if (!loadFired) done();
        }, 3000);

    } catch (error) {
        this.showError(`Failed to load traffic data: ${error.message}`);
        this.setTimeBasedLaneConfig();
        this.hideLoading();
    }
}

// Add this new method to load image through CORS proxy for analysis
async loadImageForAnalysis(imageUrl) {
    const proxies = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://cors-anywhere.herokuapp.com/'
    ];

    for (const proxy of proxies) {
        try {
            const proxyUrl = proxy + encodeURIComponent(imageUrl);
            const response = await fetch(proxyUrl);
            
            if (response.ok) {
                const blob = await response.blob();
                const img = new Image();
                img.crossOrigin = 'anonymous';  // This is key!
                
                img.onload = () => {
                    console.log('CORS-safe image loaded for analysis');
                    this.analyzeTrafficLightsFromImage(img);
                };
                
                img.onerror = () => {
                    console.warn('CORS proxy image failed to load');
                };
                
                img.src = URL.createObjectURL(blob);
                return; // Success, exit the loop
            }
        } catch (error) {
            console.warn(`Proxy ${proxy} failed:`, error);
        }
    }
    
    // All proxies failed, fall back to time-based
    console.warn('All CORS proxies failed, using time-based analysis');
    this.setTimeBasedLaneConfig();
}

// Update the analysis method to work with the CORS-safe image
analyzeTrafficLightsFromImage(img) {
    try {
        // Draw the CORS-safe image to canvas
        this.canvas.width = img.naturalWidth || img.width;
        this.canvas.height = img.naturalHeight || img.height;
        this.ctx.drawImage(img, 0, 0);
        
        // Now pixel reading should work!
        const result = this.scanForTealLights();
        this.updateUIWithResults(result);
        
        // Clean up the blob URL
        URL.revokeObjectURL(img.src);
        
    } catch (error) {
        console.warn('CORS-safe traffic light analysis failed:', error);
        this.setTimeBasedLaneConfig();
    }
}

    // Install robust load/error handlers once; they'll persist across src changes
    setupImageErrorHandlers() {
        const images = [
            { id: 'webcamImage', type: 'Webcam' },
            { id: 'delayImage',  type: 'Delay Info' },
            { id: 'queueImage',  type: 'Queue Map' }
        ];

        images.forEach(({ id, type }) => {
            const el = document.getElementById(id);
            if (!el) return;

            el.addEventListener('error', () => {
                el.style.display = 'none';

                // Avoid duplicate error blocks
                const prev = el.previousElementSibling;
                if (prev && prev.classList && prev.classList.contains('image-error')) return;

                const cleanURL = el.src ? el.src.split('?')[0] : '';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'image-error';
                errorDiv.innerHTML = `
                    <div style="
                        background: #f8f9fa;
                        border: 2px dashed #dee2e6;
                        padding: 20px;
                        text-align: center;
                        border-radius: 8px;
                        color: #6c757d;
                    ">
                        <p><strong>${type} Image</strong></p>
                        <p>Temporarily unavailable</p>
                        <small>Try opening directly: <a href="${cleanURL}" target="_blank" rel="noopener">View image</a></small>
                    </div>
                `;
                el.parentNode.insertBefore(errorDiv, el);
                
                // If webcam fails, use time-based fallback
                if (id === 'webcamImage') {
                    this.setTimeBasedLaneConfig();
                }
            });

            el.addEventListener('load', () => {
                // Remove any error block when image recovers
                const prev = el.previousElementSibling;
                if (prev && prev.classList && prev.classList.contains('image-error')) {
                    prev.remove();
                }
                el.style.display = '';
                el.style.opacity = '1';
            });
        });
    }

    // NEW: Analyze the loaded webcam image for green lights
    analyzeWebcamForGreenLights(imgElement) {
        try {
            // Set canvas size to match image
            this.canvas.width = imgElement.naturalWidth || imgElement.width;
            this.canvas.height = imgElement.naturalHeight || imgElement.height;
            
            // Draw the loaded image onto canvas
            this.ctx.drawImage(imgElement, 0, 0);
            
            // Perform green light detection
            const analysis = this.detectGreenLights(this.canvas.width, this.canvas.height);
            this.displayAnalysisResults(analysis);
            
        } catch (error) {
            console.warn('Green light analysis failed:', error);
            this.setTimeBasedLaneConfig();
        }
    }

    // NEW: Green light detection algorithm
    // Replace the detectGreenLights method with this enhanced version:
detectGreenLights(width, height) {
    // Expand the traffic light detection zone to be more comprehensive
    const zone = {
        top: Math.floor(height * 0.05),     // Start higher up
        bottom: Math.floor(height * 0.5),   // Go deeper down  
        left: Math.floor(width * 0.05),     // Start further left
        right: Math.floor(width * 0.95)     // Go further right
    };

    const centerX = Math.floor(width / 2);
    let leftGreenPixels = 0, rightGreenPixels = 0;
    let totalLeftPixels = 0, totalRightPixels = 0;
    
    // Store all green pixels found for debugging
    let leftGreenSpots = [];
    let rightGreenSpots = [];

    console.log(`Scanning zone: ${zone.top}-${zone.bottom} (height), ${zone.left}-${zone.right} (width)`);
    console.log(`Center X: ${centerX}, Image size: ${width}x${height}`);

    // Scan with smaller steps for better detection
    for (let y = zone.top; y < zone.bottom; y += 2) {
        for (let x = zone.left; x < zone.right; x += 2) {
            try {
                const pixel = this.ctx.getImageData(x, y, 1, 1).data;
                const [r, g, b] = pixel;
                
                const isGreen = this.isGreenLight(r, g, b);
                
                if (x < centerX) {
                    totalLeftPixels++;
                    if (isGreen) {
                        leftGreenPixels++;
                        leftGreenSpots.push({x, y, r, g, b});
                    }
                } else {
                    totalRightPixels++;
                    if (isGreen) {
                        rightGreenPixels++;
                        rightGreenSpots.push({x, y, r, g, b});
                    }
                }
            } catch (e) {
                continue;
            }
        }
    }

    const leftDensity = totalLeftPixels > 0 ? leftGreenPixels / totalLeftPixels : 0;
    const rightDensity = totalRightPixels > 0 ? rightGreenPixels / totalRightPixels : 0;

    // Debug logging
    console.log(`Green pixels found - Left: ${leftGreenPixels}, Right: ${rightGreenPixels}`);
    console.log(`Density - Left: ${leftDensity.toFixed(6)}, Right: ${rightDensity.toFixed(6)}`);
    console.log(`Sample green spots on right:`, rightGreenSpots.slice(0, 5));

    return this.interpretGreenLights(leftDensity, rightDensity, leftGreenPixels, rightGreenPixels, {
        leftSpots: leftGreenSpots.length,
        rightSpots: rightGreenSpots.length,
        zone: zone
    });
}

isGreenLight(r, g, b) {
    // Target color: rgb(81, 214, 208) - teal/cyan traffic light
    // This is actually more cyan than green, so we need different logic
    
    // Method 1: Direct similarity to target color
    const targetR = 81, targetG = 214, targetB = 208;
    const colorDistance = Math.sqrt(
        Math.pow(r - targetR, 2) + 
        Math.pow(g - targetG, 2) + 
        Math.pow(b - targetB, 2)
    );
    
    // If color is very close to our target (within 50 units distance)
    const isTargetColor = colorDistance < 50;
    
    // Method 2: Teal/cyan characteristics
    const isTealish = (
        g > 150 &&              // High green component
        b > 150 &&              // High blue component  
        g > r + 50 &&           // Green much higher than red
        b > r + 50 &&           // Blue much higher than red
        Math.abs(g - b) < 50    // Green and blue are close to each other
    );
    
    // Method 3: Bright cyan range
    const isBrightCyan = (
        r >= 60 && r <= 120 &&  // Red in range 60-120
        g >= 180 && g <= 255 && // Green in range 180-255
        b >= 180 && b <= 255 && // Blue in range 180-255
        g > r + 40 &&           // Green dominates red
        b > r + 40              // Blue dominates red
    );
    
    // Method 4: LED-style bright teal
    const isLEDTeal = (
        r < 150 &&              // Red stays low
        g > 200 &&              // High green
        b > 180 &&              // High blue
        (g + b) > r * 2.5       // Combined green+blue much higher than red
    );
    
    const detected = isTargetColor || isTealish || isBrightCyan || isLEDTeal;
    
    // Debug logging for detected colors
    if (detected && Math.random() < 0.01) { // Log 1% of detections
        console.log(`TEAL DETECTED: RGB(${r},${g},${b}) - Distance:${colorDistance.toFixed(1)}, Target:${isTargetColor}, Teal:${isTealish}, Cyan:${isBrightCyan}, LED:${isLEDTeal}`);
    }
    
    return detected;
}
// Update your interpretGreenLights method to be more sensitive to any teal detection:
interpretGreenLights(leftDensity, rightDensity, leftPixels, rightPixels, debugExtra) {
    // Much lower threshold since we're now looking for specific teal color
    const threshold = 0.00001; 
    const hasLeftTeal = leftPixels > 2;   // Just need a few pixels
    const hasRightTeal = rightPixels > 2; // Just need a few pixels
    
    console.log(`TEAL Detection results - Left: ${leftPixels} pixels, Right: ${rightPixels} pixels`);
    console.log(`HasLeftTeal: ${hasLeftTeal}, HasRightTeal: ${hasRightTeal}`);
    
    let result = {
        debugData: {
            leftGreenPixels: leftPixels,
            rightGreenPixels: rightPixels,
            leftDensity: leftDensity.toFixed(6),
            rightDensity: rightDensity.toFixed(6)
        }
    };

    // More aggressive - any teal detection wins
    if (rightPixels > 5) {
        result = { ...result, northbound: 1, southbound: 2, confidence: 90,
                  method: "Teal Light Detection", reasoning: `${rightPixels} teal pixels detected on RIGHT (southbound)` };
    } else if (leftPixels > 5) {
        result = { ...result, northbound: 2, southbound: 1, confidence: 90,
                  method: "Teal Light Detection", reasoning: `${leftPixels} teal pixels detected on LEFT (northbound)` };
    } else if (rightPixels > leftPixels && rightPixels > 0) {
        result = { ...result, northbound: 1, southbound: 2, confidence: 80,
                  method: "Teal Light Detection", reasoning: `More teal on RIGHT: ${rightPixels} vs ${leftPixels}` };
    } else if (leftPixels > 0) {
        result = { ...result, northbound: 2, southbound: 1, confidence: 80,
                  method: "Teal Light Detection", reasoning: `Teal detected on LEFT: ${leftPixels} pixels` };
    } else {
        const timeConfig = this.getTimeBasedLaneConfig();
        result = { ...result, ...timeConfig, confidence: 60,
                  method: "Time-Based Fallback", reasoning: `No teal traffic lights detected (target: RGB(81,214,208))` };
    }

    return result;
}

debugColorScan() {
    const webcamImage = document.getElementById('webcamImage');
    if (!webcamImage || !webcamImage.complete) {
        console.log('Webcam image not loaded');
        return;
    }

    console.clear();
    console.log('=== SIMPLE COLOR SCAN ===');
    
    // Draw image to your existing canvas
    this.canvas.width = webcamImage.naturalWidth || webcamImage.width;
    this.canvas.height = webcamImage.naturalHeight || webcamImage.height;
    this.ctx.drawImage(webcamImage, 0, 0);
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    console.log(`Image size: ${width} x ${height}`);
    
    // Look for the specific teal color RGB(81, 214, 208)
    let leftTeal = 0, rightTeal = 0;
    const centerX = width / 2;
    
    // Scan upper portion where traffic lights would be
    for (let y = Math.floor(height * 0.1); y < Math.floor(height * 0.4); y += 4) {
        for (let x = Math.floor(width * 0.1); x < Math.floor(width * 0.9); x += 4) {
            try {
                const [r, g, b] = this.ctx.getImageData(x, y, 1, 1).data;
                
                // Very loose teal detection
                if ((g > 180 && b > 180 && g > r + 30 && b > r + 30) || 
                    (g > 120 && b > 120 && g > r + 20 && b > r + 20)) {
                    
                    if (x < centerX) {
                        leftTeal++;
                    } else {
                        rightTeal++;
                    }
                    
                    // Log some examples
                    if ((leftTeal + rightTeal) <= 10) {
                        const side = x < centerX ? 'LEFT' : 'RIGHT';
                        console.log(`${side} teal at (${x},${y}): RGB(${r},${g},${b})`);
                    }
                }
            } catch (e) {
                continue;
            }
        }
    }
    
    console.log(`Results: LEFT=${leftTeal}, RIGHT=${rightTeal}`);
    
    if (rightTeal > leftTeal && rightTeal > 5) {
        console.log('RIGHT side has more teal - should show 2 SOUTHBOUND lanes');
    } else if (leftTeal > rightTeal && leftTeal > 5) {
        console.log('LEFT side has more teal - should show 2 NORTHBOUND lanes');
    } else {
        console.log('No clear teal pattern detected');
    }
    
    return { left: leftTeal, right: rightTeal };
}

// Add this method to actually analyze and update the UI:
analyzeTrafficLights() {
    const result = this.debugColorScan();
    
    if (!result) return;
    
    let northbound, southbound, confidence, method, reasoning;
    
    if (result.right > result.left && result.right > 5) {
        northbound = 1;
        southbound = 2;
        confidence = 85;
        method = "Teal Light Detection";
        reasoning = `${result.right} teal pixels on RIGHT (southbound)`;
    } else if (result.left > result.right && result.left > 5) {
        northbound = 2;
        southbound = 1;
        confidence = 85;
        method = "Teal Light Detection";  
        reasoning = `${result.left} teal pixels on LEFT (northbound)`;
    } else {
        // Fallback to time-based
        const timeConfig = this.getTimeBasedLaneConfig();
        northbound = timeConfig.northbound;
        southbound = timeConfig.southbound;
        confidence = 70;
        method = "Time-Based Fallback";
        reasoning = timeConfig.reasoning + ` (no teal detected: L=${result.left}, R=${result.right})`;
    }
    
    // Update the UI
    this.displayLaneConfiguration(northbound, southbound, confidence, method);
    this.updateDebugInfo({
        vehicles: `L:${result.left}, R:${result.right} teal pixels`,
        northbound: result.left,
        southbound: result.right,
        density: reasoning
    });
    
    // Update analysis info
    const analysisInfo = document.querySelector('.analysis-info');
    if (analysisInfo) {
        analysisInfo.innerHTML = `${confidence}% confidence • ${method}<br><small style="color: #28a745;">${reasoning}</small>`;
    }
}

// Add this method to help visualize what the algorithm is seeing
visualizeDetection() {
    // Create a small debug canvas to show what areas are being detected
    const debugCanvas = document.createElement('canvas');
    debugCanvas.width = 200;
    debugCanvas.height = 100;
    debugCanvas.style.position = 'fixed';
    debugCanvas.style.top = '10px';
    debugCanvas.style.right = '10px';
    debugCanvas.style.zIndex = '9999';
    debugCanvas.style.border = '2px solid red';
    debugCanvas.style.background = 'white';
    
    const debugCtx = debugCanvas.getContext('2d');
    debugCtx.drawImage(this.canvas, 0, 0, debugCanvas.width, debugCanvas.height);
    
    // Add to page temporarily
    document.body.appendChild(debugCanvas);
    setTimeout(() => debugCanvas.remove(), 5000);
}

    // NEW: Display analysis results with enhanced info
    displayAnalysisResults(analysis) {
        this.displayLaneConfiguration(
            analysis.northbound, 
            analysis.southbound, 
            analysis.confidence, 
            analysis.method
        );

        // Update debug info with green light data
        this.updateDebugInfo({
            vehicles: `${analysis.debugData.leftGreenPixels + analysis.debugData.rightGreenPixels} green pixels`,
            northbound: `${analysis.debugData.leftGreenPixels} (${analysis.debugData.leftDensity})`,
            southbound: `${analysis.debugData.rightGreenPixels} (${analysis.debugData.rightDensity})`,
            density: analysis.reasoning
        });

        // Show reasoning in the UI
        const analysisInfo = document.querySelector('.analysis-info');
        if (analysisInfo) {
            analysisInfo.innerHTML = `${analysis.confidence}% confidence • ${analysis.method}<br><small style="color: #28a745;">${analysis.reasoning}</small>`;
        }
    }

    getTimeBasedLaneConfig() {
        const hour = new Date().getHours();
        const day = new Date().getDay();

        // Weekend logic
        if (day === 0 || day === 6) {
            return hour >= 10 && hour < 17 
                ? { northbound: 1, southbound: 2, reasoning: "Weekend recreational traffic" }
                : { northbound: 2, southbound: 1, reasoning: "Weekend off-peak" };
        }

        // Weekday logic
        if (hour >= 6 && hour < 10) {
            return { northbound: 1, southbound: 2, reasoning: "Morning rush - into city" };
        } else if (hour >= 15 && hour < 19) {
            return { northbound: 2, southbound: 1, reasoning: "Evening rush - out of city" };
        } else {
            return { northbound: 2, southbound: 1, reasoning: "Off-peak default" };
        }
    }

    setTimeBasedLaneConfig() {
        const config = this.getTimeBasedLaneConfig();
        this.displayLaneConfiguration(
            config.northbound,
            config.southbound,
            75,
            'Time-Based Analysis'
        );

        // Update debug with time-based info
        this.updateDebugInfo({
            vehicles: 'Image analysis failed',
            northbound: config.northbound,
            southbound: config.southbound,
            density: config.reasoning
        });
    }

    displayLaneConfiguration(nb, sb, confidence, method) {
        const nbEl = document.getElementById('nbLanes');
        const sbEl = document.getElementById('sbLanes');
        const confEl = document.getElementById('confidence');
        const methodEl = document.getElementById('method');
        if (nbEl) nbEl.textContent = nb;
        if (sbEl) sbEl.textContent = sb;
        if (confEl) confEl.textContent = confidence;
        if (methodEl) methodEl.textContent = method;
    }

    updateDebugInfo(data) {
        const vEl = document.getElementById('debugVehicles');
        const nbEl = document.getElementById('debugNB');
        const sbEl = document.getElementById('debugSB');
        const dEl = document.getElementById('debugDensity');
        if (vEl) vEl.textContent = data.vehicles;
        if (nbEl) nbEl.textContent = data.northbound;
        if (sbEl) sbEl.textContent = data.southbound;
        if (dEl) dEl.textContent = data.density;
    }

    toggleDebugInfo() {
        const debugContent = document.getElementById('debugInfo');
        const arrow = document.getElementById('debugArrow');
        if (!debugContent || !arrow) return;

        if (debugContent.style.display === 'none') {
            debugContent.style.display = 'block';
            arrow.textContent = '▲';
        } else {
            debugContent.style.display = 'none';
            arrow.textContent = '▼';
        }
    }

    updateLastUpdated() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        const el = document.getElementById('lastUpdated');
        if (el) el.textContent = `Last Updated: ${timeString}`;
    }

    showLoading() {
        const loading = document.getElementById('loading');
        const content = document.getElementById('content');
        const btn = document.getElementById('refreshBtn');
        const icon = document.getElementById('refreshIcon');

        if (loading) loading.style.display = 'block';
        if (content) content.style.display = 'none';
        if (btn) btn.disabled = true;
        if (icon) icon.style.animation = 'spin 1s linear infinite';
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        const content = document.getElementById('content');
        const btn = document.getElementById('refreshBtn');
        const icon = document.getElementById('refreshIcon');

        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
        if (btn) btn.disabled = false;
        if (icon) icon.style.animation = 'none';
    }

    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        if (!errorEl) return;
        errorEl.textContent = message;
        errorEl.style.display = 'block';

        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }

    startAutoUpdate() {
        this.stopAutoUpdate();
        this.timer = setInterval(() => {
            this.fetchAllData();
        }, this.updateInterval);
    }

    stopAutoUpdate() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}



// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    new LionsGateTrafficApp();
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

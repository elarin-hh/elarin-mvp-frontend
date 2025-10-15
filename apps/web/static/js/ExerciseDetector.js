// Base Exercise Detector Class
class ExerciseDetector extends PoseDetector {
    constructor(exerciseType, performanceMode = 'performance') {
        super(performanceMode);
        this.exerciseType = exerciseType;
        this.hasError = false;
        this.counter = 0;
        this.stage = null;
        this.errors = [];
        this.errorThreshold = 0.7; // Threshold for error detection
    }

    // Get drawing colors based on error state
    getDrawingColor(hasError) {
        if (hasError) {
            return {
                landmark: '#F19301', // LIGHT_YELLOW/ORANGE
                connection: '#C71D1D' // LIGHT_RED
            };
        } else {
            return {
                landmark: '#74C611', // GREEN (correct pose)
                connection: '#4A9209' // DARK GREEN
            };
        }
    }

    // Calculate angle between three points
    calculateAngle(a, b, c) {
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs(radians * 180.0 / Math.PI);
        
        if (angle > 180.0) {
            angle = 360 - angle;
        }
        
        return angle;
    }

    // Calculate distance between two points
    calculateDistance(pointA, pointB) {
        const dx = pointB.x - pointA.x;
        const dy = pointB.y - pointA.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Check if landmarks are visible
    checkVisibility(landmarks, threshold = 0.5) {
        return landmarks.every(lm => lm.visibility > threshold);
    }

    // Override drawResults to use custom colors based on errors
    drawResults(results) {
        const canvasElement = this.canvasElement;
        const canvasCtx = this.canvasCtx;

        // Calculate FPS
        const currentTime = performance.now();
        this.frameCount++;

        if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // Draw the image
        canvasCtx.imageSmoothingEnabled = false;
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

        // Draw pose landmarks with dynamic colors
        if (results.poseLandmarks) {
            const colors = this.getDrawingColor(this.hasError);
            
            // Exclude face, hands and feet details
            const excludeIndices = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17, 18, 19, 20, 21, 22, 29, 30, 31, 32]);

            // Filter connections
            const filteredConnections = POSE_CONNECTIONS.filter(conn =>
                !excludeIndices.has(conn[0]) && !excludeIndices.has(conn[1])
            );

            // Filter landmarks
            const filteredLandmarks = results.poseLandmarks.map((landmark, index) =>
                excludeIndices.has(index) ? null : landmark
            );

            drawConnectors(canvasCtx, results.poseLandmarks, filteredConnections, {
                color: colors.connection,
                lineWidth: this.config.lineWidth
            });
            drawLandmarks(canvasCtx, filteredLandmarks.filter(l => l !== null), {
                color: colors.landmark,
                lineWidth: Math.max(1, this.config.lineWidth - 1),
                radius: this.config.radius
            });
        }

        // Draw stats overlay
        this.drawStatsOverlay();

        canvasCtx.restore();
    }

    // Draw stats overlay (FPS, counter, error state)
    drawStatsOverlay() {
        const ctx = this.canvasCtx;
        const canvas = this.canvasElement;

        // Salva o estado e desfaz o espelhamento
        ctx.save();
        ctx.scale(-1, 1);

        // Top bar (ajustado para canvas espelhado)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-canvas.width, 0, canvas.width, 50);

        // FPS Counter
        ctx.fillStyle = '#74C611';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${this.fps} FPS`, -canvas.width + 20, 30);

        // Exercise type (centralizado)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.exerciseType.toUpperCase()}`, -canvas.width / 2, 30);

        // Counter (if applicable)
        if (this.counter !== undefined && this.counter > 0) {
            ctx.fillStyle = '#74C611';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`Count: ${this.counter}`, -20, 30);
        }

        // Error indicator
        if (this.hasError) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(-canvas.width, canvas.height - 60, canvas.width, 60);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('⚠️ INCORRECT FORM', -canvas.width + 20, canvas.height - 30);

            // Display latest error message
            if (this.errors.length > 0) {
                const latestError = this.errors[this.errors.length - 1];
                ctx.font = '14px Arial';
                ctx.fillText(latestError.message, -canvas.width + 20, canvas.height - 10);
            }
        }

        ctx.restore();
    }

    // Abstract method to be implemented by subclasses
    detectExercise(results) {
        throw new Error('detectExercise() must be implemented by subclass');
    }

    // Override onResults to detect exercise
    onResults(results) {
        if (results.poseLandmarks) {
            this.detectExercise(results);
        }
        this.drawResults(results);
    }

    reset() {
        this.hasError = false;
        this.counter = 0;
        this.stage = null;
        // NÃO resetar: this.errors = [];  ← Histórico deve persistir entre sessões!
    }
}

// Expose to window for use in other scripts
window.ExerciseDetector = ExerciseDetector;


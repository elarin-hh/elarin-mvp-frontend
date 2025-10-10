// MediaPipe Pose Detection Base Class
class PoseDetector {
    constructor(performanceMode = 'performance') {
        this.pose = null;
        this.camera = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.videoElement = null;
        this.isRunning = false;
        this.fps = 0;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fpsUpdateInterval = 500; // Update FPS every 500ms
        this.lastFpsUpdate = performance.now();
        
        // Throttling para melhor FPS
        this.lastProcessTime = 0;
        this.targetFPS = 30; // Target 30 FPS para estabilidade
        this.frameInterval = 1000 / this.targetFPS;

        // Performance modes: 'performance', 'balanced', 'quality'
        this.performanceMode = performanceMode;
        this.setPerformanceConfig();
    }

    setPerformanceConfig() {
        const configs = {
            performance: {
                modelComplexity: 0,
                minDetectionConfidence: 0.3,  // Reduzido para melhor FPS
                minTrackingConfidence: 0.3,  // Reduzido para melhor FPS
                width: 640,   // Reduzido para melhor FPS
                height: 480,  // Reduzido para melhor FPS
                lineWidth: 2,
                radius: 3
            },
            balanced: {
                modelComplexity: 0,
                minDetectionConfidence: 0.4,  // Reduzido para melhor FPS
                minTrackingConfidence: 0.4,  // Reduzido para melhor FPS
                width: 854,   // Reduzido para melhor FPS
                height: 480,  // Reduzido para melhor FPS
                lineWidth: 2,
                radius: 4
            },
            quality: {
                modelComplexity: 0,  // Mudado para 0 para melhor FPS
                minDetectionConfidence: 0.5,  // Reduzido para melhor FPS
                minTrackingConfidence: 0.5,   // Reduzido para melhor FPS
                width: 1280,  // Reduzido para melhor FPS
                height: 720,  // Reduzido para melhor FPS
                lineWidth: 3,
                radius: 5
            }
        };

        this.config = configs[this.performanceMode] || configs.balanced;
    }

    async initialize(videoElement, canvasElement) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.canvasCtx = canvasElement.getContext('2d');

        // Initialize MediaPipe Pose
        this.pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });

        this.pose.setOptions({
            modelComplexity: this.config.modelComplexity,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: this.config.minDetectionConfidence,
            minTrackingConfidence: this.config.minTrackingConfidence,
            // Configurações adicionais para melhor calibração
            staticImageMode: false,
            refineLandmarks: true
        });

        this.pose.onResults((results) => this.onResults(results));
    }

    async startCamera() {
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                if (this.isRunning) {
                    await this.pose.send({ image: this.videoElement });
                }
            },
            width: this.config.width,
            height: this.config.height,
            // Configurações otimizadas para FPS
            facingMode: 'user',
            frameRate: { ideal: 60, max: 60 },  // FPS otimizado
            video: {
                width: { ideal: this.config.width },
                height: { ideal: this.config.height },
                frameRate: { ideal: 60, max: 60 }
            }
        });

        this.isRunning = true;
        await this.camera.start();
        
        // Iniciar calibração automática após 2 segundos
        setTimeout(() => {
            this.startAutoCalibration();
        }, 2000);
    }

    /**
     * Sistema de calibração automática
     */
    startAutoCalibration() {
        this.calibrationFrames = 0;
        this.calibrationData = [];
        this.isCalibrating = true;
        console.log('🎯 Iniciando calibração automática...');
    }

    /**
     * Processar calibração durante detecção
     */
    processCalibration(results) {
        if (!this.isCalibrating) return;

        this.calibrationFrames++;
        
        if (results.poseLandmarks) {
            // Calcular qualidade da detecção
            const avgVisibility = results.poseLandmarks.reduce((sum, landmark) => 
                sum + (landmark.visibility || 0), 0) / results.poseLandmarks.length;
            
            this.calibrationData.push(avgVisibility);
            
            // Manter apenas últimos 30 frames
            if (this.calibrationData.length > 30) {
                this.calibrationData.shift();
            }
        }

        // Finalizar calibração após 60 frames (2 segundos a 30fps)
        if (this.calibrationFrames >= 60) {
            this.finishCalibration();
        }
    }

    /**
     * Finalizar calibração e ajustar configurações
     */
    finishCalibration() {
        if (this.calibrationData.length === 0) {
            this.isCalibrating = false;
            return;
        }

        const avgVisibility = this.calibrationData.reduce((sum, vis) => sum + vis, 0) / this.calibrationData.length;
        const minVisibility = Math.min(...this.calibrationData);
        
        console.log(`📊 Calibração concluída - Visibilidade média: ${(avgVisibility * 100).toFixed(1)}%`);
        
        // Ajustar configurações baseado na qualidade da detecção
        if (avgVisibility < 0.6) {
            console.log('⚠️ Baixa visibilidade detectada - Ajustando configurações...');
            this.adjustForLowVisibility();
        } else if (avgVisibility > 0.8) {
            console.log('✅ Boa visibilidade detectada - Otimizando configurações...');
            this.adjustForHighVisibility();
        }
        
        this.isCalibrating = false;
    }

    /**
     * Ajustar para baixa visibilidade
     */
    adjustForLowVisibility() {
        // Reduzir thresholds para detectar melhor em condições ruins
        this.pose.setOptions({
            minDetectionConfidence: Math.max(0.3, this.config.minDetectionConfidence - 0.1),
            minTrackingConfidence: Math.max(0.3, this.config.minTrackingConfidence - 0.1)
        });
    }

    /**
     * Ajustar para alta visibilidade
     */
    adjustForHighVisibility() {
        // Aumentar thresholds para melhor precisão
        this.pose.setOptions({
            minDetectionConfidence: Math.min(0.8, this.config.minDetectionConfidence + 0.1),
            minTrackingConfidence: Math.min(0.8, this.config.minTrackingConfidence + 0.1)
        });
    }

    stopCamera() {
        this.isRunning = false;
        if (this.camera) {
            this.camera.stop();
        }
    }

    onResults(results) {
        // Throttling para melhor FPS
        const now = performance.now();
        if (now - this.lastProcessTime < this.frameInterval) {
            return; // Skip frame se muito rápido
        }
        this.lastProcessTime = now;
        
        // Processar calibração se ativa
        this.processCalibration(results);
        
        // Desenhar resultados
        this.drawResults(results);
    }

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

        // Draw pose landmarks (excluding face, hands and feet details)
        if (results.poseLandmarks) {
            // Exclude indices: 0-10 (face), 17-22 (hands), 29-32 (feet)
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
                color: '#74C611',
                lineWidth: this.config.lineWidth
            });
            drawLandmarks(canvasCtx, filteredLandmarks.filter(l => l !== null), {
                color: '#74C611',
                lineWidth: Math.max(1, this.config.lineWidth - 1),
                radius: this.config.radius
            });
        }

        // Draw FPS counter
        this.drawFPS();
        
        // Draw calibration hints
        this.drawCalibrationHints();

        canvasCtx.restore();
    }

    /**
     * Desenhar dicas de calibração
     */
    drawCalibrationHints() {
        if (!this.isCalibrating) return;
        
        const ctx = this.canvasCtx;
        const canvas = this.canvasElement;
        
        // Fundo semi-transparente
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Texto de calibração
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎯 CALIBRANDO...', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '18px Arial';
        ctx.fillText('Posicione-se bem na câmera', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText('Mantenha boa iluminação', canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('Aguarde...', canvas.width / 2, canvas.height / 2 + 50);
        
        // Barra de progresso
        const progress = Math.min(1, this.calibrationFrames / 60);
        const barWidth = 300;
        const barHeight = 10;
        const barX = (canvas.width - barWidth) / 2;
        const barY = canvas.height / 2 + 80;
        
        // Fundo da barra
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Progresso
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        
        ctx.textAlign = 'left';
    }

    drawFPS() {
        const ctx = this.canvasCtx;
        const canvas = this.canvasElement;

        // Top bar for FPS
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, 40);

        // FPS Counter
        ctx.fillStyle = '#74C611';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(`${this.fps} FPS`, 20, 28);
    }

    calculateAngle(a, b, c) {
        // Calculate angle between three points
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs(radians * 180.0 / Math.PI);

        if (angle > 180.0) {
            angle = 360 - angle;
        }

        return angle;
    }
}

// Expose to window for use in other scripts
window.PoseDetector = PoseDetector;

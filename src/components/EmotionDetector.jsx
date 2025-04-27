import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import './EmotionDetector.css';

function EmotionRecognition() {
    const videoElement = useRef();
    const canvasElement = useRef();
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const detectionIntervalRef = useRef(null);

    useEffect(() => {
        loadFaceModels();
        return () => {
            if (videoElement.current && videoElement.current.srcObject) {
                const mediaTracks = videoElement.current.srcObject.getTracks();
                mediaTracks.forEach(track => track.stop());
            }
        };
    }, []);

    const loadFaceModels = async () => {
        try {
            const modelPath = '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
                faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
            ]);
            setIsModelLoaded(true);
            startCameraStream();
        } catch (error) {
            setErrorMsg('Failed to load models: ' + error.message);
            console.error(error);
        }
    };

    const startCameraStream = () => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then((stream) => {
                if (videoElement.current) {
                    videoElement.current.srcObject = stream;
                }
            })
            .catch((error) => {
                setErrorMsg('Camera access error: ' + error.message);
                console.error(error);
            });
    };

    const onVideoPlay = () => {
        if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);

        detectionIntervalRef.current = setInterval(async () => {
            if (videoElement.current && canvasElement.current && isModelLoaded) {
                const canvas = canvasElement.current;
                canvas.width = videoElement.current.videoWidth;
                canvas.height = videoElement.current.videoHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const detectedFaces = await faceapi
                    .detectAllFaces(videoElement.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
                    .withFaceExpressions();

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                detectedFaces.forEach(face => {
                    const { box } = face.detection;
                    ctx.strokeStyle = '#00ff00';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);

                    const expressions = face.expressions;
                    const highestEmotion = Object.keys(expressions).reduce((prev, curr) =>
                        expressions[prev] > expressions[curr] ? prev : curr
                    );

                    ctx.font = '24px Arial';
                    ctx.fillStyle = '#00ff00';
                    ctx.fillText(
                        `${highestEmotion} (${Math.round(expressions[highestEmotion] * 100)}%)`,
                        box.x,
                        box.y - 10
                    );
                });
            }
        }, 100);
    };

    useEffect(() => {
        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, []);

    return (
        <div className="emotion-detector-container">
            {errorMsg && <div className="error-message">{errorMsg}</div>}

            <div className="video-wrapper">
                <video ref={videoElement} autoPlay muted onPlay={onVideoPlay} />
                <canvas ref={canvasElement} />
            </div>

            <div className="status-indicator">
                <span className={`status-dot ${isModelLoaded ? 'active' : ''}`}></span>
                {isModelLoaded ? 'Model Loaded' : 'Loading Models...'}
            </div>
        </div>
    );
}

export default EmotionRecognition;

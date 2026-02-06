import React, { useEffect, useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import io from 'socket.io-client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const SERVER_URL = 'http://localhost:3000';

function App() {
    const webcamRef = useRef(null);
    const [clientId, setClientId] = useState('');
    const [status, setStatus] = useState('Initializing...');
    const [intervalMs, setIntervalMs] = useState(300000); // 5 minutes default
    const [lastCapture, setLastCapture] = useState(null);

    useEffect(() => {
        // 1. Identity
        let storedId = localStorage.getItem('snapsentinel_client_id');
        if (!storedId) {
            storedId = uuidv4();
            localStorage.setItem('snapsentinel_client_id', storedId);
        }
        setClientId(storedId);

        // 2. Socket Connection
        const socket = io(SERVER_URL);

        socket.on('connect', () => {
            setStatus('Connected to Server');
            socket.emit('register', {
                clientId: storedId,
                os: window.navigator.platform,
                version: '1.0.0'
            });
        });

        socket.on('disconnect', () => {
            setStatus('Disconnected');
        });

        socket.on('command', (data) => {
            console.log('Received command:', data);
            if (data.command === 'capture') {
                captureAndUpload();
            } else if (data.command === 'set_interval') {
                setIntervalMs(data.payload.interval);
            }
        });

        return () => socket.disconnect();
    }, []);

    const captureAndUpload = useCallback(async () => {
        if (!webcamRef.current) return;
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        // Convert base64 to blob
        const res = await fetch(imageSrc);
        const blob = await res.blob();

        const formData = new FormData();
        formData.append('clientId', clientId);
        formData.append('image', blob, `snap.jpg`);

        try {
            await axios.post(`${SERVER_URL}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setLastCapture(new Date().toLocaleTimeString());
            console.log('Image uploaded successfully');
        } catch (err) {
            console.error('Upload failed', err);
        }
    }, [clientId]);

    // Interval Capture
    useEffect(() => {
        const timer = setInterval(() => {
            if (status.includes('Connected')) {
                captureAndUpload();
            }
        }, intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs, status, captureAndUpload]);

    return (
        <div style={{ color: '#fff' }}>
            <h1>Client Agent</h1>
            <p>ID: {clientId}</p>
            <p>Status: {status}</p>
            <p>Last Capture: {lastCapture || 'None'}</p>
            <div style={{ opacity: 0.5, pointerEvents: 'none' }}>
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width={200}
                />
            </div>
        </div>
    );
}

export default App;

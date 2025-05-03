import React, { useState, useEffect, useRef } from 'react';
import './App.css';

/**
 * Collaborative Text Editor - React Frontend
 * 
 * This component provides a collaborative text editing experience
 * where multiple users can edit the same document simultaneously.
 */
function App() {
  // State to store the document content
  const [document, setDocument] = useState("");
  // State to store the WebSocket connection
  const [socket, setSocket] = useState(null);
  // State to track connection status
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  // State to track number of connected users
  const [userCount, setUserCount] = useState(0);
  // State to handle local changes before sending to server
  const [isTyping, setIsTyping] = useState(false);
  // Ref to store the typing timeout
  const typingTimeoutRef = useRef(null);
  // Ref to keep track of latest isTyping state inside useEffect
  const isTypingRef = useRef(isTyping);

  // Keep isTypingRef updated with latest isTyping value
  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  // Connect to WebSocket server when component mounts
  useEffect(() => {
    // Create a new WebSocket connection
    const newSocket = new WebSocket('ws://localhost:3000');
    setSocket(newSocket);

    // Handle WebSocket open event
    newSocket.onopen = () => {
      console.log('WebSocket connection established');
      setConnectionStatus('connected');
    };

    // Handle incoming messages from the server
    newSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Handle different message types
        switch(message.type) {
          case 'init':
            // Initialize the document with server data
            setDocument(message.data);
            if (message.clientCount) {
              setUserCount(message.clientCount);
            }
            break;

          case 'update':
            // Only update if not currently typing to avoid cursor jumps
            if (!isTypingRef.current) {
              setDocument(message.data);
            }
            break;

          case 'userCount':
            // Update the user count display
            setUserCount(message.count);
            break;

          case 'pong':
            // Received response to ping
            console.log('Server is responsive');
            break;

          default:
            console.log('Received unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    // Handle WebSocket errors
    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };

    // Handle WebSocket close event
    newSocket.onclose = () => {
      console.log('WebSocket connection closed');
      setConnectionStatus('disconnected');
    };

    // Set up a periodic ping to keep the connection alive
    const pingInterval = setInterval(() => {
      if (newSocket.readyState === WebSocket.OPEN) {
        newSocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds

    // Clean up when component unmounts
    return () => {
      clearInterval(pingInterval);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      newSocket.close();
    };
  }, []);

  /**
   * Handle changes to the document content
   * Implements a debounce mechanism to avoid sending too many updates
   */
  const handleChange = (e) => {
    const newContent = e.target.value;
    setDocument(newContent);
    setIsTyping(true);

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set a new timeout to send the update after user stops typing
    typingTimeoutRef.current = setTimeout(() => {
      sendUpdate(newContent);
      setIsTyping(false);
    }, 500); // 500ms debounce time
  };

  /**
   * Send document update to the server
   */
  const sendUpdate = (content) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'update',
        data: content
      }));
    } else {
      console.warn('Cannot send update: WebSocket not connected');
      setConnectionStatus('disconnected');
    }
  };

  /**
   * Attempt to reconnect to the server
   */
  const handleReconnect = () => {
    if (socket) {
      socket.close();
    }

    const newSocket = new WebSocket('ws://localhost:3000');
    setSocket(newSocket);
    setConnectionStatus('connecting');
  };

  // Render the collaborative editor UI
  return (
    <div className="App">
      <header className="App-header">
        <h1>Collaborative Text Editor</h1>
        <div className="status-bar">
          <div className={`connection-status ${connectionStatus}`}>
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 
             'Disconnected'}
          </div>
          <div className="user-count">
            {userCount} {userCount === 1 ? 'user' : 'users'} online
          </div>
          {connectionStatus !== 'connected' && (
            <button className="reconnect-button" onClick={handleReconnect}>
              Reconnect
            </button>
          )}
        </div>
      </header>
      <main className="editor-container">
        <textarea
          className="collaborative-editor"
          value={document}
          onChange={handleChange}
          placeholder="Start typing to collaborate..."
          rows={20}
          cols={80}
        />
      </main>
      <footer className="App-footer">
        {isTyping && <span className="typing-indicator">Syncing changes...</span>}
      </footer>
    </div>
  );
}

export default App;

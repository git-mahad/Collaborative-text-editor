# Collaborative Text Editor

A real-time collaborative text editor that allows multiple users to edit documents simultaneously. Changes are synchronized instantly across all connected clients, providing a seamless collaborative writing experience.

## Features

- **Real-time Collaboration**: Multiple users can edit the same document simultaneously
- **Live User Count**: See how many users are currently editing the document
- **Connection Status**: Visual indicators show connection status (connected, connecting, disconnected)
- **Auto-reconnect**: Ability to reconnect if the connection drops
- **Debounced Updates**: Efficient network usage by sending updates only after typing pauses
- **Responsive Design**: Works well on both desktop and mobile devices

## Technology Stack

- **Frontend**: React.js
- **Backend**: WebSocket server (implementation not included in this repository)
- **Communication**: WebSocket protocol for real-time bidirectional communication


## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/git-mahad/Collaborative-text-editor.git
   cd collaborative-text-editor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
4. Go to client folder and download dependencies
  cd client
   ```bash
   npm install
   ```

5. Open [http://localhost:3001](http://localhost:3001) in your browser

## Usage

1. Open the application in your web browser
2. Start typing in the text area
3. Share the URL with collaborators
4. All connected users will see changes in real-time

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- Inspired by collaborative editors like Google Docs and Etherpad
- Built with React and WebSockets for real-time communication
- Special thanks to all contributors
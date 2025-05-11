const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/whiteboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'whiteboard.html'));
});

// Store meetings data
const meetings = new Map();

io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Handle meeting creation
    socket.on('createMeeting', (data) => {
        const meetingId = generateMeetingId();
        const hostName = data.meetingName;
        
        meetings.set(meetingId, {
            password: data.password,
            participants: new Set([`${hostName} (Host)`]),
            canvasState: null,
            isLocked: false
        });
        
        socket.join(meetingId);
        socket.emit('meetingCreated', { meetingId });
    });
    
    // Handle joining a meeting
    socket.on('joinMeeting', (data) => {
        const { meetingId, username } = data;
        
        if (!meetings.has(meetingId)) {
            socket.emit('error', { message: 'Meeting not found' });
            return;
        }
        
        const meeting = meetings.get(meetingId);
        meeting.participants.add(username);
        
        socket.join(meetingId);
        socket.emit('meetingJoined', { 
            meetingId, 
            participants: Array.from(meeting.participants),
            isLocked: meeting.isLocked
        });
        
        // Notify other participants
        socket.to(meetingId).emit('participantJoined', {
            username,
            participants: Array.from(meeting.participants)
        });
    });
    
    // Handle password validation
    socket.on('validatePassword', ({ meetingId, password }, callback) => {
        const meeting = meetings.get(meetingId);
        callback(meeting?.password === password);
    });
    
    // Handle drawing data
    socket.on('draw', (data) => {
        socket.to(data.meetingId).emit('drawingData', data);
    });
    
    // Handle clear board
    socket.on('clear', (data) => {
        socket.to(data.meetingId).emit('drawingData', { 
            meetingId: data.meetingId,
            type: 'clear'
        });
    });
    
    // Handle chat messages
    socket.on('chatMessage', (data) => {
        io.to(data.meetingId).emit('newChatMessage', data);
    });
    
    // Handle host controls
    socket.on('kickUser', ({ meetingId, username }) => {
        const meeting = meetings.get(meetingId);
        if (meeting) {
            meeting.participants.delete(username);
            io.to(meetingId).emit('userKicked', username);
        }
    });
    
    socket.on('toggleLock', ({ meetingId, isLocked }) => {
        const meeting = meetings.get(meetingId);
        if (meeting) {
            meeting.isLocked = isLocked;
            io.to(meetingId).emit('boardLocked', isLocked);
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
        
        // Find and remove the disconnected user from meetings
        meetings.forEach((meeting, meetingId) => {
            let usernameToRemove = null;
            
            meeting.participants.forEach(participant => {
                if (socket.id in io.sockets.adapter.rooms.get(meetingId) || !participant.includes('(Host)')) {
                    usernameToRemove = participant;
                }
            });
            
            if (usernameToRemove) {
                meeting.participants.delete(usernameToRemove);
                socket.to(meetingId).emit('participantLeft', {
                    username: usernameToRemove,
                    participants: Array.from(meeting.participants)
                });
            }
        });
    });
});

function generateMeetingId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
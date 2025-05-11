document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const canvas = document.getElementById('whiteboard');
    const ctx = canvas.getContext('2d');
    const createMeetingBtn = document.getElementById('createMeetingBtn');
    const meetingForm = document.getElementById('meetingForm');
    const startMeetingBtn = document.getElementById('startMeetingBtn');
    const joinMeetingBtn = document.getElementById('joinMeetingBtn');
    const participantsList = document.getElementById('participantsList');
    const chatMessages = document.getElementById('chatMessages');
    const chatMessageInput = document.getElementById('chatMessage');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const hostControls = document.getElementById('hostControls');
    const kickUserBtn = document.getElementById('kickUserBtn');
    const lockBoardBtn = document.getElementById('lockBoardBtn');
    const unlockBoardBtn = document.getElementById('unlockBoardBtn');
    const passwordModal = document.getElementById('passwordModal');
    const submitPasswordBtn = document.getElementById('submitPasswordBtn');
    const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    
    // Tools
    const pencilTool = document.getElementById('pencilTool');
    const eraserTool = document.getElementById('eraserTool');
    const rectTool = document.getElementById('rectTool');
    const circleTool = document.getElementById('circleTool');
    const lineTool = document.getElementById('lineTool');
    const textTool = document.getElementById('textTool');
    const colorPicker = document.getElementById('colorPicker');
    const brushSize = document.getElementById('brushSize');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const clearBoard = document.getElementById('clearBoard');
    
    // Socket.io connection
    const socket = io();
    
    // App state
    let isDrawing = false;
    let currentTool = 'pencil';
    let currentShape = null;
    let currentColor = '#000000';
    let currentBrushSize = 5;
    let meetingId = null;
    let username = '';
    let isHost = false;
    let startX, startY;
    
    // Drawing history
    let drawingHistory = [];
    let historyIndex = -1;
    
    // Initialize canvas
    function initCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
    }
    
    // Resize canvas when window resizes
    window.addEventListener('resize', () => {
        initCanvas();
    });
    
    // Drawing functions
    function startDrawing(e) {
        if (currentTool === 'text') return;
        
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        
        if (currentTool === 'pencil' || currentTool === 'eraser') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
        }
    }
    
    function stopDrawing() {
        if (isDrawing) {
            saveState();
        }
        isDrawing = false;
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.lineWidth = currentBrushSize;
        ctx.lineCap = 'round';
        
        if (currentTool === 'pencil') {
            ctx.strokeStyle = currentColor;
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
            
            emitDrawingData(x, y, true);
        } 
        else if (currentTool === 'eraser') {
            ctx.strokeStyle = 'white';
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
            
            emitDrawingData(x, y, true);
        }
        else if (currentTool === 'shape') {
            // Redraw canvas from history to avoid multiple shapes
            restoreCanvas();
            
            ctx.beginPath();
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentBrushSize;
            
            if (currentShape === 'rectangle') {
                ctx.rect(startX, startY, x - startX, y - startY);
            } 
            else if (currentShape === 'circle') {
                const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
                ctx.arc(startX, startY, radius, 0, Math.PI * 2);
            }
            else if (currentShape === 'line') {
                ctx.moveTo(startX, startY);
                ctx.lineTo(x, y);
            }
            
            ctx.stroke();
        }
    }
    
    function emitDrawingData(x, y, isDrawing) {
        if (meetingId) {
            socket.emit('draw', {
                meetingId,
                x,
                y,
                tool: currentTool,
                shape: currentShape,
                color: currentColor,
                size: currentBrushSize,
                isDrawing,
                type: 'drawing'
            });
        }
    }
    
    // Text tool
    function handleTextTool(e) {
        if (currentTool !== 'text') return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const text = prompt('Enter text:');
        if (text) {
            ctx.font = `${currentBrushSize * 3}px Arial`;
            ctx.fillStyle = currentColor;
            ctx.fillText(text, x, y);
            saveState();
            
            if (meetingId) {
                socket.emit('draw', {
                    meetingId,
                    x,
                    y,
                    text,
                    tool: 'text',
                    color: currentColor,
                    size: currentBrushSize,
                    type: 'text'
                });
            }
        }
    }
    
    // Drawing history
    function saveState() {
        const state = canvas.toDataURL();
        drawingHistory = drawingHistory.slice(0, historyIndex + 1);
        drawingHistory.push(state);
        historyIndex = drawingHistory.length - 1;
    }
    
    function restoreCanvas() {
        if (historyIndex >= 0) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = drawingHistory[historyIndex];
        }
    }
    
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            restoreCanvas();
        }
    }
    
    function redo() {
        if (historyIndex < drawingHistory.length - 1) {
            historyIndex++;
            restoreCanvas();
        }
    }
    
    // Event listeners for drawing
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('dblclick', handleTextTool);
    
    // Tool selection
    pencilTool.addEventListener('click', () => {
        currentTool = 'pencil';
        currentShape = null;
        setActiveTool(pencilTool);
    });
    
    eraserTool.addEventListener('click', () => {
        currentTool = 'eraser';
        currentShape = null;
        setActiveTool(eraserTool);
    });
    
    rectTool.addEventListener('click', () => {
        currentTool = 'shape';
        currentShape = 'rectangle';
        setActiveTool(rectTool);
    });
    
    circleTool.addEventListener('click', () => {
        currentTool = 'shape';
        currentShape = 'circle';
        setActiveTool(circleTool);
    });
    
    lineTool.addEventListener('click', () => {
        currentTool = 'shape';
        currentShape = 'line';
        setActiveTool(lineTool);
    });
    
    textTool.addEventListener('click', () => {
        currentTool = 'text';
        currentShape = null;
        setActiveTool(textTool);
    });
    
    function setActiveTool(activeTool) {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeTool.classList.add('active');
    }
    
    colorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
    });
    
    brushSize.addEventListener('input', (e) => {
        currentBrushSize = e.target.value;
    });
    
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    
    clearBoard.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
        
        if (meetingId) {
            socket.emit('clear', { meetingId });
        }
    });
    
    // Meeting controls
    createMeetingBtn.addEventListener('click', () => {
        meetingForm.classList.toggle('hidden');
    });
    
    startMeetingBtn.addEventListener('click', () => {
        const meetingName = document.getElementById('meetingName').value.trim();
        const password = document.getElementById('meetingPassword').value.trim();
        
        if (meetingName) {
            username = meetingName + ' (Host)';
            isHost = true;
            socket.emit('createMeeting', { meetingName, password });
        }
    });
    
    joinMeetingBtn.addEventListener('click', () => {
        const id = document.getElementById('meetingId').value.trim();
        const name = document.getElementById('username').value.trim();
        
        if (id && name) {
            meetingId = id;
            username = name;
            
            // Check if meeting requires password
            socket.emit('validatePassword', { meetingId }, (requiresPassword) => {
                if (requiresPassword) {
                    showPasswordModal();
                } else {
                    joinMeeting();
                }
            });
        }
    });
    
    function joinMeeting() {
        socket.emit('joinMeeting', { meetingId, username });
    }
    
    // Host controls
    kickUserBtn.addEventListener('click', () => {
        const usernameToKick = document.getElementById('kickUsername').value.trim();
        if (usernameToKick && isHost) {
            socket.emit('kickUser', { meetingId, username: usernameToKick });
            document.getElementById('kickUsername').value = '';
        }
    });
    
    lockBoardBtn.addEventListener('click', () => {
        if (isHost) {
            socket.emit('toggleLock', { meetingId, isLocked: true });
            lockBoardBtn.classList.add('hidden');
            unlockBoardBtn.classList.remove('hidden');
        }
    });
    
    unlockBoardBtn.addEventListener('click', () => {
        if (isHost) {
            socket.emit('toggleLock', { meetingId, isLocked: false });
            unlockBoardBtn.classList.add('hidden');
            lockBoardBtn.classList.remove('hidden');
        }
    });
    
    // Password modal
    function showPasswordModal() {
        passwordModal.classList.remove('hidden');
    }
    
    submitPasswordBtn.addEventListener('click', () => {
        const password = document.getElementById('meetingPasswordInput').value.trim();
        if (password) {
            socket.emit('validatePassword', { meetingId, password }, (isValid) => {
                if (isValid) {
                    passwordModal.classList.add('hidden');
                    joinMeeting();
                } else {
                    alert('Incorrect password!');
                }
            });
        }
    });
    
    cancelPasswordBtn.addEventListener('click', () => {
        passwordModal.classList.add('hidden');
    });
    
    // Chat functionality
    function sendMessage() {
        const message = chatMessageInput.value.trim();
        if (message && meetingId) {
            const messageData = {
                meetingId,
                username,
                message,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            socket.emit('chatMessage', messageData);
            addMessageToChat(messageData);
            chatMessageInput.value = '';
        }
    }
    
    sendMessageBtn.addEventListener('click', sendMessage);
    chatMessageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    function addMessageToChat(data) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.innerHTML = `
            <span class="sender">${data.username}</span>
            <span class="time">${data.timestamp}</span>
            <div>${data.message}</div>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function addSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.innerHTML = `<em>${message}</em>`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Socket.io event handlers
    socket.on('meetingCreated', (data) => {
        meetingId = data.meetingId;
        document.getElementById('meetingId').value = meetingId;
        meetingForm.classList.add('hidden');
        hostControls.classList.remove('hidden');
        alert(`Meeting created! Share this ID with others: ${meetingId}`);
    });
    
    socket.on('meetingJoined', (data) => {
        meetingId = data.meetingId;
        updateParticipantsList(data.participants);
        
        if (data.isLocked) {
            canvas.style.pointerEvents = 'none';
            if (isHost) {
                lockBoardBtn.classList.add('hidden');
                unlockBoardBtn.classList.remove('hidden');
            }
        }
        
        if (username.includes('(Host)')) {
            isHost = true;
            hostControls.classList.remove('hidden');
        }
    });
    
    socket.on('participantJoined', (data) => {
        updateParticipantsList(data.participants);
        addSystemMessage(`${data.username} joined the meeting`);
    });
    
    socket.on('participantLeft', (data) => {
        updateParticipantsList(data.participants);
        addSystemMessage(`${data.username} left the meeting`);
    });
    
    socket.on('userKicked', (kickedUsername) => {
        if (kickedUsername === username) {
            alert('You have been kicked from the meeting');
            window.location.reload();
        } else {
            addSystemMessage(`${kickedUsername} was kicked from the meeting`);
        }
    });
    
    socket.on('boardLocked', (isLocked) => {
        canvas.style.pointerEvents = isLocked ? 'none' : 'auto';
        addSystemMessage(`Board has been ${isLocked ? 'locked' : 'unlocked'}`);
    });
    
    socket.on('newChatMessage', (data) => {
        addMessageToChat(data);
    });
    
    socket.on('drawingData', (data) => {
        if (data.type === 'drawing') {
            ctx.lineWidth = data.size;
            ctx.lineCap = 'round';
            ctx.strokeStyle = data.tool === 'eraser' ? 'white' : data.color;
            
            if (data.isDrawing) {
                ctx.lineTo(data.x, data.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(data.x, data.y);
            }
        } else if (data.type === 'text') {
            ctx.font = `${data.size * 3}px Arial`;
            ctx.fillStyle = data.color;
            ctx.fillText(data.text, data.x, data.y);
        } else if (data.type === 'clear') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    });
    
    // Helper functions
    function updateParticipantsList(participants) {
        participantsList.innerHTML = '';
        participants.forEach(participant => {
            const li = document.createElement('li');
            li.textContent = participant;
            if (participant.includes('(Host)')) {
                li.classList.add('host');
            }
            participantsList.appendChild(li);
        });
    }
    
    // Initialize the app
    initCanvas();
});
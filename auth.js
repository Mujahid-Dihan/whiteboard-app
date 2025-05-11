document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const demoLoginBtn = document.getElementById('demoLoginBtn');

    // Tab switching
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });

    // Form validation
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function validatePassword(password) {
        return password.length >= 8;
    }

    // Demo login handler
    demoLoginBtn.addEventListener('click', () => {
        localStorage.setItem('demoUser', 'true');
        localStorage.setItem('username', 'Demo User');
        window.location.href = 'whiteboard.html';
    });

    // Login handler
    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!validateEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }

        if (!validatePassword(password)) {
            alert('Password must be at least 8 characters');
            return;
        }

        // In a real app, this would make an API call
        localStorage.setItem('username', email.split('@')[0]);
        window.location.href = 'whiteboard.html';
    });

    // Register handler
    registerBtn.addEventListener('click', () => {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('registerConfirm').value;

        if (!name || !email || !password || !confirm) {
            alert('Please fill in all fields');
            return;
        }

        if (!validateEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }

        if (!validatePassword(password)) {
            alert('Password must be at least 8 characters');
            return;
        }

        if (password !== confirm) {
            alert('Passwords do not match');
            return;
        }

        localStorage.setItem('username', name);
        window.location.href = 'whiteboard.html';
    });
});
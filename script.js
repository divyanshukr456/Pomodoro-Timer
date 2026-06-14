// ==========================================
// POMODORO TIMER APP - JAVASCRIPT
// ==========================================

class PomodoroTimer {
    constructor() {
        // Default settings
        this.settings = {
            studyDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 20,
            sessionsGoal: 8,
            soundAlerts: true,
            notifications: true,
            theme: localStorage.getItem('pomodoroTheme') || 'light'
        };

        // Timer state
        this.timerState = {
            isRunning: false,
            currentSession: 'study',
            timeLeft: this.settings.studyDuration * 60,
            totalTime: this.settings.studyDuration * 60,
            sessionsCompleted: parseInt(localStorage.getItem('sessionsCompleted')) || 0,
            totalSessions: parseInt(localStorage.getItem('totalSessions')) || 0,
            focusTimeToday: parseInt(localStorage.getItem('focusTimeToday')) || 0,
            lastSessionDate: localStorage.getItem('lastSessionDate') || new Date().toDateString(),
            streak: parseInt(localStorage.getItem('streak')) || 0
        };

        this.timerInterval = null;
        this.quotes = [
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { text: "Success is no accident. It is hard work, perseverance, learning, studying, sacrifice and most of all, love of what you are doing.", author: "Pelé" },
            { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
            { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
            { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
            { text: "Excellence is not a destination; it is a continuous journey that never ends.", author: "Brian Tracy" },
            { text: "Your limitation—it's only your imagination.", author: "Anonymous" },
            { text: "Push yourself, because no one else is going to do it for you.", author: "Anonymous" }
        ];

        this.init();
        this.loadSettings();
        this.checkStreak();
        this.updateUI();
    }

    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.initializeParticles();
        this.applyTheme();
        this.displayRandomQuote();
        this.requestNotificationPermission();
    }

    cacheElements() {
        // Timer elements
        this.timerDisplay = document.getElementById('timerDisplay');
        this.sessionLabel = document.getElementById('sessionLabel');
        this.progressCircle = document.getElementById('progressCircle');
        
        // Buttons
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.skipBtn = document.getElementById('skipBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.themeToggle = document.getElementById('themeToggle');
        this.closeModalBtn = document.getElementById('closeModal');
        
        // Session buttons
        this.sessionBtns = document.querySelectorAll('.session-btn');
        
        // Stats
        this.sessionsCompletedEl = document.getElementById('sessionsCompleted');
        this.sessionsRemainingEl = document.getElementById('sessionsRemaining');
        this.focusTimeEl = document.getElementById('focusTime');
        this.streakEl = document.getElementById('streakCounter');
        this.totalSessionsEl = document.getElementById('totalSessions');
        
        // Modal
        this.settingsModal = document.getElementById('settingsModal');
        this.settingOptions = document.querySelectorAll('.setting-option');
        this.customInputs = document.querySelectorAll('.custom-input');
        
        // Music
        this.youtubeUrl = document.getElementById('youtubeUrl');
        this.loadMusicBtn = document.getElementById('loadMusicBtn');
        this.musicPlayerContainer = document.getElementById('musicPlayerContainer');
        
        // Quote
        this.quoteText = document.getElementById('quoteText');
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.skipBtn.addEventListener('click', () => this.skip());
        
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.closeModalBtn.addEventListener('click', () => this.closeSettings());
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.closeSettings();
        });
        
        this.sessionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.selectSession(e.target.dataset.session));
        });
        
        this.settingOptions.forEach(option => {
            option.addEventListener('click', (e) => this.updateSetting(e));
        });
        
        this.customInputs.forEach(input => {
            input.addEventListener('change', (e) => this.handleCustomInput(e));
        });
        
        this.loadMusicBtn.addEventListener('click', () => this.loadMusic());
        this.youtubeUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadMusic();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.timerState.isRunning) {
                e.preventDefault();
                this.start();
            }
            if (e.code === 'Space' && this.timerState.isRunning) {
                e.preventDefault();
                this.pause();
            }
            if (e.code === 'KeyR') this.reset();
            if (e.code === 'KeyS') this.skip();
        });
    }

    start() {
        if (this.timerState.isRunning) return;
        
        this.timerState.isRunning = true;
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        
        this.timerInterval = setInterval(() => {
            this.timerState.timeLeft--;
            
            if (this.timerState.timeLeft < 0) {
                this.completeSession();
            } else {
                this.updateDisplay();
            }
        }, 1000);
    }

    pause() {
        this.timerState.isRunning = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        clearInterval(this.timerInterval);
    }

    reset() {
        this.timerState.isRunning = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        clearInterval(this.timerInterval);
        
        this.setSessionDuration();
        this.updateDisplay();
    }

    skip() {
        clearInterval(this.timerInterval);
        this.timerState.isRunning = false;
        this.completeSession();
    }

    selectSession(session) {
        if (this.timerState.isRunning) return;
        
        this.timerState.currentSession = session;
        
        this.sessionBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-session="${session}"]`).classList.add('active');
        
        this.setSessionDuration();
        this.updateDisplay();
    }

    setSessionDuration() {
        const durations = {
            'study': this.settings.studyDuration * 60,
            'short-break': this.settings.shortBreakDuration * 60,
            'long-break': this.settings.longBreakDuration * 60
        };
        
        this.timerState.totalTime = durations[this.timerState.currentSession];
        this.timerState.timeLeft = this.timerState.totalTime;
        
        const labels = {
            'study': 'Study Session',
            'short-break': 'Short Break',
            'long-break': 'Long Break'
        };
        
        this.sessionLabel.textContent = labels[this.timerState.currentSession];
    }

    updateDisplay() {
        const minutes = Math.floor(this.timerState.timeLeft / 60);
        const seconds = this.timerState.timeLeft % 60;
        
        this.timerDisplay.textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        const progress = 1 - (this.timerState.timeLeft / this.timerState.totalTime);
        const circumference = 879.645;
        const offset = circumference * (1 - progress);
        
        this.progressCircle.style.strokeDashoffset = offset;
    }

    completeSession() {
        clearInterval(this.timerInterval);
        this.timerState.isRunning = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        
        if (this.timerState.currentSession === 'study') {
            this.timerState.sessionsCompleted++;
            this.timerState.totalSessions++;
            this.timerState.focusTimeToday += this.settings.studyDuration;
            
            this.saveStats();
            this.showNotification('Study session completed! 🎉');
            this.playSound();
            this.celebrate();
            
            if (this.timerState.sessionsCompleted % 4 === 0) {
                this.selectSession('long-break');
            } else {
                this.selectSession('short-break');
            }
        } else {
            this.showNotification('Break finished! Ready to study? 💪');
            this.playSound();
            this.selectSession('study');
        }
        
        this.updateUI();
        this.setSessionDuration();
        this.updateDisplay();
        
        if (this.timerState.sessionsCompleted === this.settings.sessionsGoal) {
            this.celebrateGoal();
        }
    }

    celebrate() {
        for (let i = 0; i < 20; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * window.innerWidth + 'px';
            confetti.style.top = Math.random() * window.innerHeight + 'px';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 2000);
        }
    }

    celebrateGoal() {
        const message = `🎊 Congratulations! You've completed ${this.settings.sessionsGoal} sessions today! 🎊`;
        this.showNotification(message);
    }

    updateSetting(e) {
        const target = e.target;
        const settingName = target.dataset.setting;
        const value = target.dataset.value;
        
        // Update settings object
        if (settingName === 'soundAlerts' || settingName === 'notifications') {
            this.settings[settingName] = value === 'true';
        } else {
            this.settings[settingName] = parseInt(value);
        }
        
        // Update UI
        document.querySelectorAll(`[data-setting="${settingName}"]`).forEach(btn => {
            btn.classList.remove('selected');
        });
        target.classList.add('selected');
        
        // Save and update timer
        this.saveSettings();
        this.selectSession(this.timerState.currentSession);
    }

    handleCustomInput(e) {
        const input = e.target;
        const value = parseInt(input.value);
        
        if (!value || value < 1) return;
        
        if (input.id === 'customStudy') {
            this.settings.studyDuration = value;
        } else if (input.id === 'customShortBreak') {
            this.settings.shortBreakDuration = value;
        } else if (input.id === 'customLongBreak') {
            this.settings.longBreakDuration = value;
        } else if (input.id === 'customGoal') {
            this.settings.sessionsGoal = value;
        }
        
        this.saveSettings();
        this.selectSession(this.timerState.currentSession);
    }

    openSettings() {
        this.settingsModal.classList.add('active');
    }

    closeSettings() {
        this.settingsModal.classList.remove('active');
    }

    loadSettings() {
        const saved = localStorage.getItem('pomodoroSettings');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.settings = { ...this.settings, ...parsed };
        }
        
        this.updateSettingsUI();
    }

    saveSettings() {
        localStorage.setItem('pomodoroSettings', JSON.stringify(this.settings));
    }

    updateSettingsUI() {
        // Update setting options
        document.querySelectorAll('.setting-option').forEach(btn => {
            const setting = btn.dataset.setting;
            const value = btn.dataset.value;
            
            if (this.settings[setting] === parseInt(value) || 
                this.settings[setting] === (value === 'true')) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
        
        // Update custom inputs
        document.getElementById('customStudy').value = this.settings.studyDuration;
        document.getElementById('customShortBreak').value = this.settings.shortBreakDuration;
        document.getElementById('customLongBreak').value = this.settings.longBreakDuration;
        document.getElementById('customGoal').value = this.settings.sessionsGoal;
    }

    saveStats() {
        localStorage.setItem('sessionsCompleted', this.timerState.sessionsCompleted);
        localStorage.setItem('totalSessions', this.timerState.totalSessions);
        localStorage.setItem('focusTimeToday', this.timerState.focusTimeToday);
        localStorage.setItem('lastSessionDate', new Date().toDateString());
    }

    updateUI() {
        this.sessionsCompletedEl.textContent = this.timerState.sessionsCompleted;
        this.sessionsRemainingEl.textContent = Math.max(0, this.settings.sessionsGoal - this.timerState.sessionsCompleted);
        
        const hours = Math.floor(this.timerState.focusTimeToday / 60);
        this.focusTimeEl.textContent = `${hours}h`;
        
        this.streakEl.textContent = this.timerState.streak;
        this.totalSessionsEl.textContent = this.timerState.totalSessions;
    }

    checkStreak() {
        const lastDate = new Date(this.timerState.lastSessionDate);
        const today = new Date();
        
        const diffTime = today - lastDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            // Same day, streak continues
        } else if (diffDays === 1) {
            // Next day, increment streak
            this.timerState.streak++;
            localStorage.setItem('streak', this.timerState.streak);
        } else {
            // More than 1 day, reset streak
            this.timerState.streak = 0;
            localStorage.setItem('streak', this.timerState.streak);
        }
    }

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('pomodoroTheme', isDark ? 'dark' : 'light');
        this.themeToggle.textContent = isDark ? '☀️' : '🌙';
    }

    applyTheme() {
        if (this.settings.theme === 'dark') {
            document.body.classList.add('dark-mode');
            this.themeToggle.textContent = '☀️';
        }
    }

    displayRandomQuote() {
        const quote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
        this.quoteText.textContent = `"${quote.text}" — ${quote.author}`;
    }

    loadMusic() {
        const url = this.youtubeUrl.value.trim();
        
        if (!url) {
            this.showNotification('Please enter a YouTube URL');
            return;
        }
        
        const videoId = this.extractYouTubeId(url);
        if (!videoId) {
            this.showNotification('Invalid YouTube URL. Please try again.');
            return;
        }
        
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        this.musicPlayerContainer.innerHTML = `
            <iframe 
                width="100%" 
                height="200" 
                src="${embedUrl}?autoplay=0" 
                title="YouTube music player" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        `;
        
        this.musicPlayerContainer.classList.add('active');
        localStorage.setItem('lastYouTubeUrl', url);
        this.showNotification('Music player loaded! 🎵');
    }

    extractYouTubeId(url) {
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        
        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        
        return null;
    }

    showNotification(message) {
        if (!this.settings.notifications) return;
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
        
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('StudyFlow', { body: message });
        }
    }

    playSound() {
        if (!this.settings.soundAlerts) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    initializeParticles() {
        const container = document.getElementById('particlesContainer');
        const particleCount = window.innerWidth > 768 ? 50 : 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const size = Math.random() * 4 + 2;
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            const duration = Math.random() * 10 + 15;
            
            const colors = ['#B19CD9', '#FFB6C1', '#87CEEB', '#98D8C8'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.backgroundColor = color;
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.animationDuration = duration + 's';
            particle.style.animationDelay = Math.random() * 5 + 's';
            
            container.appendChild(particle);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
});

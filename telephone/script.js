// --- Audio Utility: DTMF & Ringback ---
class PhoneAudio {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.dtmfFreqs = {
            '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
            '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
            '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
            '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
        };
        this.osc1 = null;
        this.osc2 = null;
        this.gainNode = null;
        this.ringInterval = null;

        // Global unlock for mobile/modern browsers
        document.addEventListener('click', () => {
            if (this.context.state === 'suspended') {
                this.context.resume();
            }
        }, { once: true });
    }

    playDTMF(digit) {
        if (this.context.state === 'suspended') this.context.resume();
        if (!this.dtmfFreqs[digit]) return;
        this.stopDTMF();

        const [f1, f2] = this.dtmfFreqs[digit];
        this.osc1 = this.context.createOscillator();
        this.osc2 = this.context.createOscillator();
        this.gainNode = this.context.createGain();

        this.osc1.frequency.value = f1;
        this.osc2.frequency.value = f2;
        this.gainNode.gain.value = 0.1;

        this.osc1.connect(this.gainNode);
        this.osc2.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);

        this.osc1.start();
        this.osc2.start();

        setTimeout(() => this.stopDTMF(), 150);
    }

    stopDTMF() {
        if (this.osc1) this.osc1.stop();
        if (this.osc2) this.osc2.stop();
        this.osc1 = null;
        this.osc2 = null;
    }

    startRingback() {
        if (this.context.state === 'suspended') this.context.resume();
        const playRing = () => {
            const osc1 = this.context.createOscillator();
            const osc2 = this.context.createOscillator();
            const gain = this.context.createGain();

            osc1.frequency.value = 440;
            osc2.frequency.value = 480;
            gain.gain.value = 0.05;

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.context.destination);

            osc1.start();
            osc2.start();

            setTimeout(() => {
                osc1.stop();
                osc2.stop();
            }, 1000);
        };

        playRing();
        this.ringInterval = setInterval(playRing, 3000);
    }

    stopRingback() {
        if (this.ringInterval) {
            clearInterval(this.ringInterval);
            this.ringInterval = null;
        }
    }

    playClick() {
        if (this.context.state === 'suspended') this.context.resume();
        
        const now = this.context.currentTime;
        
        // Layer 1: Low-mid thud
        const osc1 = this.context.createOscillator();
        const gain1 = this.context.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(300, now);
        osc1.frequency.exponentialRampToValueAtTime(10, now + 0.1);
        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc1.connect(gain1);
        gain1.connect(this.context.destination);
        
        // Layer 2: High-frequency 'tick' for clarity
        const osc2 = this.context.createOscillator();
        const gain2 = this.context.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(800, now);
        osc2.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        gain2.gain.setValueAtTime(0.2, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc2.connect(gain2);
        gain2.connect(this.context.destination);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.15);
        osc2.stop(now + 0.15);
        
        console.log("Improved click sound played with layered oscillators");
    }
}

const audio = new PhoneAudio();

// --- State Management ---
let state = {
    correctNumber: '010-1234-5678',
    messages: [
        '성공! 지금 당장 선생님께 가서 상품을 받으세요!',
        "상품은 없지만, 오늘 하루 '가정 천재' 타이틀을 무상으로 대여해 드립니다.",
        '상품은 없지만, 이 전화를 성공시킨 당신의 능력에 무한 박수를,,,짝짝짝',
        '상품은 없지만, 지금 이 순간만큼은 당신이 이 교실의 주인공입니다. 자, 주인공은 다시 자리로 가서 공부하세요!'
    ],
    dialedNumber: '',
    isAdminVisible: true,
    isPasswordHidden: true
};

// --- DOM Elements ---
const landingSection = document.getElementById('landingSection');
const adminSection = document.getElementById('adminSection');
const studentSection = document.getElementById('studentSection');
const mainTitle = document.getElementById('mainTitle');
const goToAdminBtn = document.getElementById('goToAdminBtn');
const correctNumberInput = document.getElementById('correctNumber');
const toggleVisibilityBtn = document.getElementById('toggleVisibility');
const newMessageInput = document.getElementById('newMessage');
const addMessageBtn = document.getElementById('addMessageBtn');
const messageListContainer = document.getElementById('messageList');
const startStudentModeBtn = document.getElementById('startStudentMode');
const backToAdminBtn = document.getElementById('backToAdminBtn');

let callTimerInterval = null;
let callSeconds = 0;
let messageSequenceTimeouts = [];

const dialedNumberDisplay = document.getElementById('dialedNumber');
const callBtn = document.getElementById('callBtn');
const backspaceBtn = document.getElementById('backspaceBtn');
const currentTimeDisplay = document.getElementById('currentTime');
const connectingOverlay = document.getElementById('connectingOverlay');
const endCallBtn = document.getElementById('endCallBtn');
const successOverlay = document.getElementById('successOverlay');
const imessageContainer = document.getElementById('imessageContainer');
const exitSuccessBtn = document.getElementById('exitSuccess');

// --- Initialization ---
const eyeIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const eyeOffIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

function init() {
    renderMessages();
    correctNumberInput.value = state.correctNumber;
    correctNumberInput.type = 'password'; 
    state.isPasswordHidden = true;
    toggleVisibilityBtn.innerHTML = eyeOffIcon;
    updateClock();
    setInterval(updateClock, 1000);
}

// --- Utils ---
function formatPhoneNumber(value) {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 8) {
        return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    }
    return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7, 11)}`;
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    currentTimeDisplay.textContent = `${hours}:${minutes}`;
}

function startCallTimer() {
    callSeconds = 1;
    const timerDisplay = document.getElementById('callTimer');
    timerDisplay.textContent = '00:01';
    
    callTimerInterval = setInterval(() => {
        callSeconds++;
        const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const secs = String(callSeconds % 60).padStart(2, '0');
        timerDisplay.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopCallTimer() {
    if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
    }
    // Also clear any pending message sequences
    messageSequenceTimeouts.forEach(t => clearTimeout(t));
    messageSequenceTimeouts = [];
}

// --- Flow Transitions ---
goToAdminBtn.addEventListener('click', () => {
    landingSection.classList.remove('active');
    adminSection.classList.add('active');
});

// --- Admin Logic ---
correctNumberInput.addEventListener('input', (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    e.target.value = formatted;
    state.correctNumber = formatted;
});

toggleVisibilityBtn.addEventListener('click', () => {
    state.isPasswordHidden = !state.isPasswordHidden;
    correctNumberInput.type = state.isPasswordHidden ? 'password' : 'text';
    toggleVisibilityBtn.innerHTML = state.isPasswordHidden ? eyeOffIcon : eyeIcon;
    console.log("Password visibility toggled:", !state.isPasswordHidden);
});

addMessageBtn.addEventListener('click', () => {
    const msg = newMessageInput.value.trim();
    if (msg) {
        state.messages.push(msg);
        newMessageInput.value = '';
        renderMessages();
    }
});

function renderMessages() {
    messageListContainer.innerHTML = '';
    state.messages.forEach((msg, index) => {
        const div = document.createElement('div');
        div.className = 'message-item';
        div.innerHTML = `
            <span>${msg}</span>
            <button class="delete-btn" onclick="deleteMessage(${index})">✕</button>
        `;
        messageListContainer.appendChild(div);
    });
}

window.deleteMessage = (index) => {
    state.messages.splice(index, 1);
    renderMessages();
};

startStudentModeBtn.addEventListener('click', () => {
    adminSection.classList.remove('active');
    studentSection.classList.add('active');
    mainTitle.style.display = 'none';
    backToAdminBtn.style.display = 'flex';
});

// --- Student Logic ---
document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', () => {
        const digit = key.getAttribute('data-key');
        audio.playDTMF(digit);
        
        if (state.dialedNumber.replace(/[^\d]/g, '').length < 11) {
            state.dialedNumber += digit;
            dialedNumberDisplay.textContent = formatPhoneNumber(state.dialedNumber);
        }
    });
});

backspaceBtn.addEventListener('click', () => {
    state.dialedNumber = state.dialedNumber.slice(0, -1);
    dialedNumberDisplay.textContent = formatPhoneNumber(state.dialedNumber);
});

callBtn.addEventListener('click', () => {
    if (state.dialedNumber === '') return;
    
    // Check if correct
    const inputNum = formatPhoneNumber(state.dialedNumber);
    connectingOverlay.classList.add('active');
    audio.startRingback();

    setTimeout(() => {
        audio.stopRingback();
        if (inputNum === state.correctNumber) {
            showSuccess();
        } else {
            showFailure();
        }
    }, 6500);
});

function showSuccess() {
    console.log("Showing success screen with sequence");
    connectingOverlay.classList.remove('active');
    
    // 1. Play the 'pickup' click sound FIRST
    audio.playClick();

    const messageEl = document.getElementById('incallMessage');
    successOverlay.style.display = 'flex'; 
    successOverlay.classList.add('active');
    
    startCallTimer();

    // --- Message Sequence ---
    const updateMsg = (text) => {
        messageEl.style.animation = 'none';
        messageEl.offsetHeight; // trigger reflow
        messageEl.textContent = text;
        messageEl.style.animation = 'fadeInText 0.6s ease-out forwards';
    };

    // 1. Initial greeting (0~3s)
    updateMsg("여보세요?");

    // 2. Second greeting (3~6s)
    messageSequenceTimeouts.push(setTimeout(() => {
        updateMsg("전화해줘서 고마워요!");
    }, 3000));

    // 3. Final admin message (6s onwards)
    messageSequenceTimeouts.push(setTimeout(() => {
        const randomMsg = state.messages.length > 0 
            ? state.messages[Math.floor(Math.random() * state.messages.length)]
            : '연결되었습니다.';
        updateMsg(randomMsg);
    }, 6000));
}

function showFailure() {
    console.log("Showing failure logic");
    audio.stopRingback();
    dialedNumberDisplay.classList.add('shake');
    
    setTimeout(() => {
        dialedNumberDisplay.classList.remove('shake');
        connectingOverlay.classList.remove('active');
        
        // Brief failure message on overlay
        const status = document.getElementById('callStatus');
        const originalStatus = status.textContent;
        
        status.textContent = '연결 실패';
        status.style.color = 'var(--ios-red)';
        connectingOverlay.classList.add('active');
        
        setTimeout(() => {
            connectingOverlay.classList.remove('active');
            status.textContent = originalStatus;
            status.style.color = '';
            state.dialedNumber = '';
            dialedNumberDisplay.textContent = '';
        }, 2000);
    }, 500);
}

endCallBtn.addEventListener('click', () => {
    audio.stopRingback();
    connectingOverlay.classList.remove('active');
});

exitSuccessBtn.addEventListener('click', () => {
    stopCallTimer();
    successOverlay.classList.remove('active');
    successOverlay.style.display = 'none';
    state.dialedNumber = '';
    dialedNumberDisplay.textContent = '';
});

backToAdminBtn.addEventListener('click', () => {
    stopCallTimer();
    studentSection.classList.remove('active');
    adminSection.classList.add('active');
    mainTitle.style.display = 'block';
    backToAdminBtn.style.display = 'none';
    
    // Reset state
    successOverlay.classList.remove('active');
    connectingOverlay.classList.remove('active');
    state.dialedNumber = '';
    dialedNumberDisplay.textContent = '';
    audio.stopRingback();
});

// Transition back to admin (Hidden feature: click status bar)
document.querySelectorAll('.status-bar').forEach(bar => {
    bar.addEventListener('click', () => {
        studentSection.classList.remove('active');
        adminSection.classList.add('active');
        mainTitle.style.display = 'block';
        backToAdminBtn.style.display = 'none';
        
        // Reset state
        successOverlay.classList.remove('active');
        connectingOverlay.classList.remove('active');
        state.dialedNumber = '';
        dialedNumberDisplay.textContent = '';
        audio.stopRingback();
    });
});

init();

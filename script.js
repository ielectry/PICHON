/**
 * ELECTRY ENGINE - ADAPTED SCRIPT
 * Compatible con motor_electry.py (Puerto 8765)
 */

// --- CONFIGURACIÓN ---
const WEBSOCKET_URL = "ws://127.0.0.1:8765"; // Puerto sincronizado con el motor Python

// Referencias DOM
const faders = {
  2: document.getElementById('fader-2'),
  3: document.getElementById('fader-3')
};

const buttons = {
  2: {
    act: document.getElementById('act-2'),
    hpf: document.getElementById('hpf-2'),
    bpf: document.getElementById('bpf-2'),
    lpf: document.getElementById('lpf-2')
  },
  3: {
    act: document.getElementById('act-3'),
    hpf: document.getElementById('hpf-3'),
    bpf: document.getElementById('bpf-3'),
    lpf: document.getElementById('lpf-3')
  }
};

// Mapeo CC (El motor envía el número de control en la propiedad 'channel')
const CC_TO_CONTROL = {
  1: { type: 'fader', ch: 2 },
  2: { type: 'fader', ch: 3 },

  10: { type: 'button', ch: 2, name: 'hpf' },
  11: { type: 'button', ch: 2, name: 'bpf' },
  12: { type: 'button', ch: 2, name: 'lpf' },
  14: { type: 'button', ch: 3, name: 'hpf' },
  15: { type: 'button', ch: 3, name: 'bpf' },
  16: { type: 'button', ch: 3, name: 'lpf' },

  13: { type: 'button', ch: 2, name: 'act' },
  17: { type: 'button', ch: 3, name: 'act' }
};

// Constantes de diseño
const FILTER_COMBO_WINDOW_MS = 80;
const lastFilterOnTime = { 2: 0, 3: 0 };
const actPressed = { 2: false, 3: false };

// --- LÓGICA DE PROCESAMIENTO ---

function setFader(ch, normalizedVal) {
  const thumb = faders[ch];
  if (!thumb) return;

  // El motor envía 'val' ya normalizado (0.0 a 1.0)
  const percentage = (normalizedVal * 100).toFixed(2);
  thumb.style.bottom = `${percentage}%`;
}

function setFilterGroupState(ch, activeName, value) {
  const channelButtons = buttons[ch];
  if (!channelButtons) return;

  if (value <= 0.5) return; // Equivalente a value <= 63 en escala 0-127

  const now = performance.now();
  const inComboWindow = now - (lastFilterOnTime[ch] || 0) <= FILTER_COMBO_WINDOW_MS;
  const filterNames = ['hpf', 'bpf', 'lpf'];

  if (!inComboWindow) {
    // Modo radio: apaga el resto
    filterNames.forEach(name => {
      const btn = channelButtons[name];
      if (btn) btn.classList.toggle('active', name === activeName);
    });
  } else {
    // Modo combo: añade el nuevo filtro
    const btn = channelButtons[activeName];
    if (btn) btn.classList.add('active');
  }

  lastFilterOnTime[ch] = now;
}

function setButtonState(ch, name, normalizedVal) {
  const channelButtons = buttons[ch];
  if (!channelButtons) return;

  if (name === 'hpf' || name === 'bpf' || name === 'lpf') {
    setFilterGroupState(ch, name, normalizedVal);
    return;
  }

  const button = channelButtons[name];
  if (!button) return;

  if (name === 'act') {
    const isPressed = normalizedVal > 0.5; // Flanco de subida
    const wasPressed = actPressed[ch];

    if (isPressed && !wasPressed) {
      button.classList.toggle('active');
    }
    actPressed[ch] = isPressed;
    return;
  }
}

// --- CONEXIÓN ---

function onMIDIData(data) {
  // El motor envía { val: float, channel: int }
  const control = CC_TO_CONTROL[data.channel];
  if (!control) return;

  if (control.type === 'fader') {
    setFader(control.ch, data.val);
  } else if (control.type === 'button') {
    setButtonState(control.ch, control.name, data.val);
  }
}

function connectWebSocket() {
  const socket = new WebSocket(WEBSOCKET_URL);

  socket.onopen = () => console.log("✅ Conectado al Motor Electry");
  
  socket.onmessage = event => {
    try {
      onMIDIData(JSON.parse(event.data));
    } catch (e) {
      console.warn("Error parseando MIDI:", e);
    }
  };

  socket.onclose = () => {
    console.log('🔌 Reconectando...');
    setTimeout(connectWebSocket, 3000);
  };
}


window.addEventListener('load', connectWebSocket);

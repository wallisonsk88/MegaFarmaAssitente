/* ══════════════════════════════════════════════════════════════
   Assistente Digital MegaFarma — App Logic
   ══════════════════════════════════════════════════════════════ */

const API_BASE = window.location.origin;

// ── DOM Elements ───────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const welcomeScreen = $('#welcomeScreen');
const chatContainer = $('#chatContainer');
const chatMessages = $('#chatMessages');
const messageInput = $('#messageInput');
const btnSend = $('#btnSend');
const btnMic = $('#btnMic');
const btnImage = $('#btnImage');
const btnNewChat = $('#btnNewChat');
const btnConfig = $('#btnConfig');
const configModal = $('#configModal');
const couponModal = $('#couponModal');
const couponBar = $('#couponBar');
const fileInput = $('#fileInput');
const imagePreview = $('#imagePreview');
const imagePreviewImg = $('#imagePreviewImg');
const btnRemoveImage = $('#btnRemoveImage');
const avatarContainer = $('#avatarContainer');
const toast = $('#toast');

// ── State ──────────────────────────────────────────────────────
let conversationHistory = [];
let pendingImageB64 = null;
let isListening = false;
let recognition = null;
let messageCount = 0;

// ── Fullscreen ─────────────────────────────────────────────────
function requestFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (req) {
    req.call(el).catch(() => { });
  }
}

// Auto fullscreen on first interaction
document.addEventListener('click', function autoFS() {
  requestFullscreen();
  document.removeEventListener('click', autoFS);
}, { once: true });

// ── Toast ──────────────────────────────────────────────────────
function showToast(msg, duration = 3000) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Time helper ────────────────────────────────────────────────
function getTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── Switch to Chat View ────────────────────────────────────────
function showChat() {
  welcomeScreen.classList.add('hidden');
  chatContainer.classList.add('active');
  messageInput.focus();
}

// ── New Chat ───────────────────────────────────────────────────
function newChat() {
  conversationHistory = [];
  messageCount = 0;
  chatMessages.innerHTML = '';
  pendingImageB64 = null;
  imagePreview.classList.remove('visible');
  couponBar.classList.remove('visible');
  welcomeScreen.classList.remove('hidden');
  chatContainer.classList.remove('active');
  if (typeof stopAudio === 'function') stopAudio();
}

// ── Add Message ────────────────────────────────────────────────
function addMessage(role, text, imageData = null) {
  const div = document.createElement('div');
  div.className = `message ${role}`;

  const avatarHtml = role === 'bot'
    ? '<img src="avatar.png" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">'
    : '👤';

  let contentHTML = '';
  if (imageData) {
    contentHTML += `<img src="data:image/jpeg;base64,${imageData}" alt="Imagem enviada">`;
  }
  // Process simple markdown-like formatting
  const formattedText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  contentHTML += formattedText;

  // Add listen button for bot messages
  const listenBtnHtml = role === 'bot'
    ? `<button class="btn-listen" onclick="speakText(this.dataset.text)" data-text="${text.replace(/"/g, '&quot;')}">🔊 Ouvir</button>`
    : '';

  div.innerHTML = `
    <div class="message-avatar">${avatarHtml}</div>
    <div>
      <div class="bubble">${contentHTML}</div>
      <div class="message-meta">
        <span class="message-time">${getTime()}</span>
        ${listenBtnHtml}
      </div>
    </div>
  `;

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ── Typing Indicator ───────────────────────────────────────────
function showTyping() {
  const div = document.createElement('div');
  div.className = 'message bot';
  div.id = 'typingMsg';
  div.innerHTML = `
    <div class="message-avatar">
      <img src="avatar.png" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">
    </div>
    <div>
      <div class="bubble">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typingMsg');
  if (el) el.remove();
}

// ── Send Message ───────────────────────────────────────────────
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text && !pendingImageB64) return;

  showChat();

  // Add user message to chat
  addMessage('user', text || '📷 Imagem enviada', pendingImageB64);

  // Clear input
  messageInput.value = '';
  messageInput.style.height = 'auto';
  btnSend.disabled = true;
  messageInput.blur(); // <-- Close mobile keyboard / Voice typing to prevent listening to TTS
  document.activeElement?.blur();

  const imageToSend = pendingImageB64;
  pendingImageB64 = null;
  imagePreview.classList.remove('visible');

  // Add to history
  conversationHistory.push({ role: 'user', content: text || '[imagem enviada]' });

  // Show typing
  showTyping();

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text || 'Analise esta imagem, por favor.',
        history: conversationHistory.slice(-10), // Last 10 messages
        image: imageToSend,
      }),
    });

    removeTyping();

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      addMessage('bot', `⚠️ ${err.error || 'Erro ao processar sua mensagem.'}`);
      return;
    }

    const data = await res.json();
    const botResponse = data.response || 'Sem resposta.';

    addMessage('bot', botResponse);
    conversationHistory.push({ role: 'assistant', content: botResponse });

    // TTS — speak the response
    speakText(botResponse);

    // Show coupon bar after a few messages
    messageCount++;
    if (messageCount >= 3) {
      couponBar.classList.add('visible');
    }

  } catch (err) {
    removeTyping();
    addMessage('bot', '⚠️ Erro de conexão. Verifique se o servidor está rodando.');
  }
}

// ── TTS (Neural Voice via Backend) ─────────────────────────────
let currentAudio = null;

async function speakText(text) {
  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  // Force keyboard close to prevent OS-level voice typing from transcribing TTS
  messageInput.blur();
  document.activeElement?.blur();

  if (!text || !text.trim()) return;

  // Update listen button state
  const btns = document.querySelectorAll('.btn-listen');
  btns.forEach(b => b.textContent = '🔊 Ouvir');

  try {
    const res = await fetch(`${API_BASE}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      console.log('[TTS] Server error:', res.status);
      return;
    }

    const audioBlob = await res.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    currentAudio = new Audio(audioUrl);
    currentAudio.volume = 1.0;

    currentAudio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
    };

    currentAudio.onerror = () => {
      console.log('[TTS] Audio playback error');
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
    };

    await currentAudio.play();
  } catch (err) {
    console.log('[TTS] Error:', err);
  }
}

// Stop audio when starting new chat
function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

// ── Speech Recognition ─────────────────────────────────────────
function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const rec = new SpeechRecognition();
  rec.lang = 'pt-BR';
  rec.continuous = false;
  rec.interimResults = false;

  rec.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    messageInput.value = transcript;
    updateSendBtn();
    stopListening();
    // Auto-send after voice
    setTimeout(() => sendMessage(), 300);
  };

  rec.onerror = () => stopListening();
  rec.onend = () => stopListening();

  return rec;
}

function startListening() {
  if (!recognition) recognition = setupSpeechRecognition();
  if (!recognition) {
    // Check if HTTPS is missing (required for mic on mobile)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      showToast('Microfone requer HTTPS. Peça ao administrador para ativar SSL.');
    } else {
      showToast('Reconhecimento de voz não suportado neste navegador');
    }
    return;
  }
  // Hide keyboard by removing focus from input
  messageInput.blur();
  document.activeElement?.blur();

  isListening = true;
  avatarContainer.classList.add('listening');
  btnMic.classList.add('active');
  try {
    recognition.start();
  } catch (e) {
    stopListening();
  }
}

function stopListening() {
  isListening = false;
  avatarContainer.classList.remove('listening');
  btnMic.classList.remove('active');
  if (recognition) {
    try { recognition.stop(); } catch (e) { }
  }
}

function toggleListening() {
  if (isListening) {
    stopListening();
  } else {
    stopAudio(); // Stop bot from speaking while listening
    startListening();
  }
}

// ── Image Handling ─────────────────────────────────────────────
function handleImageSelect(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('Imagem muito grande. Máximo: 5 MB');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const b64 = e.target.result.split(',')[1];
    pendingImageB64 = b64;
    imagePreviewImg.src = e.target.result;
    imagePreview.classList.add('visible');
    showChat();
    updateSendBtn();
  };
  reader.readAsDataURL(file);
}

// ── Config Modal ───────────────────────────────────────────────
const PROVIDER_INFO = {
  openrouter: {
    url: 'https://openrouter.ai/keys',
    models: [
      { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)' },
      { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)' },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)' },
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct:free', name: 'Llama 4 Scout (Free)' }
    ]
  },
  groq: {
    url: 'https://console.groq.com/keys',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' }
    ]
  },
  huggingface: {
    url: 'https://huggingface.co/settings/tokens',
    models: [
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B v0.3' },
      { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B' },
      { id: 'meta-llama/Meta-Llama-3-8B-Instruct', name: 'Llama 3 8B' }
    ]
  }
};

function updateModelList(provider, currentModel = null) {
  const info = PROVIDER_INFO[provider];
  const modelSelect = $('#cfgModel');
  if (!info) return;

  modelSelect.innerHTML = info.models.map(m =>
    `<option value="${m.id}" ${currentModel === m.id ? 'selected' : ''}>${m.name}</option>`
  ).join('');

  // If currentModel is not in the list but exists, add it as a custom option
  if (currentModel && !info.models.some(m => m.id === currentModel)) {
    const opt = document.createElement('option');
    opt.value = currentModel;
    opt.textContent = `${currentModel} (Atual)`;
    opt.selected = true;
    modelSelect.appendChild(opt);
  }
}

function handleProviderChange() {
  const provider = $('#cfgProvider').value;
  updateModelList(provider);

  const info = PROVIDER_INFO[provider];
  if (info) {
    window.open(info.url, '_blank');
    showToast(`Redirecionando para ${provider}...`);
  }
}

async function loadConfig() {
  try {
    const res = await fetch(`${API_BASE}/config`);
    const data = await res.json();
    const provider = data.MODEL_PROVIDER || 'openrouter';

    $('#cfgProvider').value = provider;
    updateModelList(provider, data.MODEL_NAME);

    $('#cfgApiKey').value = '';
    $('#cfgApiKey').placeholder = data.has_api_key ? '••••••• (já configurada)' : 'Insira sua chave de API';
  } catch (e) {
    showToast('Não foi possível carregar configurações');
  }
}

async function saveConfig() {
  const payload = {
    MODEL_PROVIDER: $('#cfgProvider').value,
    MODEL_NAME: $('#cfgModel').value,
  };
  const apiKey = $('#cfgApiKey').value.trim();
  if (apiKey) payload.API_KEY = apiKey;

  try {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    showToast(data.message || 'Configuração salva!');
    configModal.classList.remove('active');
  } catch (e) {
    showToast('Erro ao salvar configuração');
  }
}

// ── Coupon System ──────────────────────────────────────────────
function generateCoupon() {
  const name = $('#couponName').value.trim();
  const phone = $('#couponPhone').value.trim();
  if (!name || !phone) {
    showToast('Preencha nome e telefone');
    return;
  }
  const code = 'MEGA' + Math.random().toString(36).substring(2, 8).toUpperCase();
  couponModal.classList.remove('active');
  couponBar.classList.remove('visible');
  addMessage('bot', `🎁 **Cupom gerado com sucesso!**\n\n👤 Nome: ${name}\n📱 Telefone: ${phone}\n🏷️ Código: **${code}**\n\nApresente este código no caixa para obter seu desconto!\nVálido por 7 dias.`);
  showToast(`Cupom ${code} gerado!`);
  // Clear fields
  $('#couponName').value = '';
  $('#couponPhone').value = '';
}

// ── Auto-resize textarea ───────────────────────────────────────
function autoResize() {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

function updateSendBtn() {
  btnSend.disabled = !messageInput.value.trim() && !pendingImageB64;
}

// ── Event Listeners ────────────────────────────────────────────

// Welcome buttons
$('#btnWelcomeMic').addEventListener('click', () => { showChat(); toggleListening(); });
$('#btnWelcomeType').addEventListener('click', () => { showChat(); messageInput.focus(); });
$('#btnWelcomeImage').addEventListener('click', () => { showChat(); fileInput.click(); });

// Input
messageInput.addEventListener('input', () => { autoResize(); updateSendBtn(); });
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Buttons
btnSend.addEventListener('click', sendMessage);
btnMic.addEventListener('click', toggleListening);
btnImage.addEventListener('click', () => fileInput.click());
btnNewChat.addEventListener('click', newChat);
btnRemoveImage.addEventListener('click', () => {
  pendingImageB64 = null;
  imagePreview.classList.remove('visible');
  updateSendBtn();
});

// File input
fileInput.addEventListener('change', (e) => {
  handleImageSelect(e.target.files[0]);
  fileInput.value = '';
});

// Config modal
btnConfig.addEventListener('click', () => {
  const pwd = prompt('Acesso restrito. Digite a senha:');
  if (pwd === 'mega2024') {
    loadConfig();
    configModal.classList.add('active');
  } else if (pwd !== null) {
    showToast('Senha incorreta!');
  }
});
$('#cfgProvider').addEventListener('change', handleProviderChange);
$('#btnCancelConfig').addEventListener('click', () => configModal.classList.remove('active'));
$('#btnSaveConfig').addEventListener('click', saveConfig);

// Coupon
couponBar.addEventListener('click', () => couponModal.classList.add('active'));
$('#btnCancelCoupon').addEventListener('click', () => couponModal.classList.remove('active'));
$('#btnSaveCoupon').addEventListener('click', generateCoupon);

// Close modals on overlay click
configModal.addEventListener('click', (e) => { if (e.target === configModal) configModal.classList.remove('active'); });
couponModal.addEventListener('click', (e) => { if (e.target === couponModal) couponModal.classList.remove('active'); });

// ── PWA / Service Worker + Install Prompt ──────────────────
let deferredInstallPrompt = null;
const installBanner = document.getElementById('installBanner');
const btnInstallPWA = document.getElementById('btnInstallPWA');
const btnDismissInstall = document.getElementById('btnDismissInstall');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}

// Capture the install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;

  // Check if user dismissed before
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed) {
    const dismissedTime = parseInt(dismissed, 10);
    // Show again after 7 days
    if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return;
  }

  // Show install banner after 3 seconds
  setTimeout(() => {
    if (installBanner) installBanner.classList.add('visible');
  }, 3000);
});

// Install button click
if (btnInstallPWA) {
  btnInstallPWA.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      // If no deferred prompt, show manual instructions
      showToast('Abra no Microsoft Edge e clique em ⋯ → "Instalar site como app"');
      installBanner.classList.remove('visible');
      return;
    }

    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;

    if (outcome === 'accepted') {
      showToast('✅ App instalado com sucesso!');
    }

    deferredInstallPrompt = null;
    installBanner.classList.remove('visible');
  });
}

// Dismiss button click
if (btnDismissInstall) {
  btnDismissInstall.addEventListener('click', () => {
    installBanner.classList.remove('visible');
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  });
}

// Detect when app is installed
window.addEventListener('appinstalled', () => {
  showToast('✅ MegaFarma instalado no seu dispositivo!');
  installBanner.classList.remove('visible');
  deferredInstallPrompt = null;
});

// If already installed (standalone mode), hide banner
if (window.matchMedia('(display-mode: standalone)').matches) {
  if (installBanner) installBanner.style.display = 'none';
}

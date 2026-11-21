const messagesEl = document.getElementById('messages');
const form = document.getElementById('chatForm');
const input = document.getElementById('messageInput');
const mic = document.getElementById('micButton');
const voiceState = document.getElementById('voiceState');
const history = [];
let conversationId = sessionStorage.getItem('jarvisConversationId') || crypto.randomUUID();
sessionStorage.setItem('jarvisConversationId', conversationId);
let accessPassword = sessionStorage.getItem('jarvisAccessPassword') || '';

function addMessage(role, text) {
  const row = document.createElement('div'); row.className = `message ${role}`;
  const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = role === 'assistant' ? 'J' : 'I';
  const body = document.createElement('div'); const label = document.createElement('b'); label.textContent = role === 'assistant' ? 'JARVIS' : 'VOCÊ';
  const p = document.createElement('p'); p.textContent = text; body.append(label, p); row.append(avatar, body); messagesEl.append(row); messagesEl.scrollTop = messagesEl.scrollHeight;
  return row;
}
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'pt-BR'; utterance.rate = 1; window.speechSynthesis.speak(utterance);
}
function getPassword() {
  if (!accessPassword) {
    accessPassword = window.prompt('Digite a senha de acesso do JARVIS:') || '';
    if (accessPassword) sessionStorage.setItem('jarvisAccessPassword', accessPassword);
  }
  return accessPassword;
}
async function sendMessage(text) {
  const clean = text.trim(); if (!clean) return;
  addMessage('user', clean); history.push({role:'user', content:clean}); input.value = '';
  const waitingNode = addMessage('assistant', 'JARVIS está processando sua solicitação...');
  try {
    const password = getPassword(); if (!password) throw new Error('Senha não informada.');
    const response = await fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${password}`}, body:JSON.stringify({conversationId, message:clean})});
    const data = await response.json();
    if (response.status === 401) { sessionStorage.removeItem('jarvisAccessPassword'); accessPassword = ''; throw new Error('Senha incorreta. Tente novamente.'); }
    if (!response.ok) throw new Error(data.error || 'Falha na comunicação.');
    waitingNode.querySelector('p').textContent = data.reply; history.push({role:'assistant', content:data.reply}); speak(data.reply);
    document.getElementById('aiStatus').textContent = '● Conectada'; document.getElementById('aiStatus').className = 'good';
  } catch (error) { waitingNode.querySelector('p').textContent = 'Não consegui concluir: ' + error.message; }
}
form.addEventListener('submit', e => {e.preventDefault(); sendMessage(input.value);});
document.getElementById('clearButton').addEventListener('click', () => {
  history.length = 0; messagesEl.innerHTML = ''; conversationId = crypto.randomUUID(); sessionStorage.setItem('jarvisConversationId', conversationId);
  addMessage('assistant', 'Nova conversa iniciada. Como posso ajudar?');
});
document.querySelectorAll('[data-prompt]').forEach(b => b.addEventListener('click', () => sendMessage(b.dataset.prompt)));
document.querySelectorAll('.nav').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.nav').forEach(n => n.classList.remove('active')); b.classList.add('active');
  const titles = {assistant:'Assistente JARVIS',professional:'Módulo profissional',personal:'Módulo pessoal',home:'Casa inteligente',finance:'Módulo financeiro'};
  document.getElementById('pageTitle').textContent = titles[b.dataset.section] || 'JARVIS';
  if (b.dataset.section !== 'assistant') sendMessage('Vamos trabalhar no módulo ' + titles[b.dataset.section] + '. Ajude-me a começar.');
}));
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  document.getElementById('speechStatus').textContent = '● Disponível'; document.getElementById('speechStatus').className = 'good';
  const recognition = new SpeechRecognition(); recognition.lang = 'pt-BR'; recognition.interimResults = false; recognition.maxAlternatives = 1;
  recognition.onstart = () => {mic.classList.add('listening'); voiceState.textContent = 'OUVINDO...';};
  recognition.onend = () => {mic.classList.remove('listening'); voiceState.textContent = 'TOQUE PARA FALAR';};
  recognition.onerror = () => {voiceState.textContent = 'TENTE NOVAMENTE';};
  recognition.onresult = e => {const transcript = e.results[0][0].transcript; input.value = transcript; sendMessage(transcript);};
  mic.addEventListener('click', () => {try {recognition.start();} catch(e) {}});
} else {
  document.getElementById('speechStatus').textContent = '● Não suportado'; document.getElementById('speechStatus').className = 'pending';
  mic.addEventListener('click', () => {voiceState.textContent = 'VOZ NÃO SUPORTADA NESTE NAVEGADOR';});
}
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));

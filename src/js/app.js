const API_URL = 'http://localhost:7071';
const WS_URL = 'ws://localhost:7071';

let currentUser = null;
let socket = null;

const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const nicknameInput = document.getElementById('nickname-input');
const authError = document.getElementById('auth-error');

const chatContainer = document.getElementById('chat-container');
const usersList = document.getElementById('users-list');
const messagesList = document.getElementById('messages-list');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

// Форматирование времени сообщения (ЧЧ:ММ ДД.ММ.ГГГГ)
function formatDate(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const day = date.toLocaleDateString('ru-RU');
  return `${time} ${day}`;
}

// Отрисовка списка пользователей слева
function renderUsers(users) {
  usersList.innerHTML = '';

  users.forEach((user) => {
    const isYou = currentUser && user.id === currentUser.id;
    const li = document.createElement('li');
    li.className = `users-list__item${isYou ? ' users-list__item--you' : ''}`;

    const avatar = document.createElement('span');
    avatar.className = 'users-list__avatar';

    const name = document.createElement('span');
    name.textContent = isYou ? 'You' : user.name;

    li.append(avatar, name);
    usersList.append(li);
  });
}

// Отрисовка одного сообщения
function renderMessage(data) {
  const isOwn = currentUser && data.user.id === currentUser.id;

  const msgEl = document.createElement('div');
  msgEl.className = `message${isOwn ? ' message--own' : ''}`;

  const metaEl = document.createElement('div');
  metaEl.className = 'message__meta';
  const authorName = isOwn ? 'You' : data.user.name;
  metaEl.textContent = `${authorName}, ${formatDate(data.timestamp)}`;

  const textEl = document.createElement('div');
  textEl.className = 'message__text';
  textEl.textContent = data.message;

  msgEl.append(metaEl, textEl);
  messagesList.append(msgEl);
  messagesList.scrollTop = messagesList.scrollHeight;
}

// Инициализация WebSocket после успешной регистрации
function initWebSocket() {
  socket = new WebSocket(WS_URL);

  socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);

    // Сервер присылает массив активных пользователей при входе/выходе участников
    if (Array.isArray(data)) {
      renderUsers(data);
      return;
    }

    // Сервер присылает новое сообщение чата
    if (data.type === 'send') {
      renderMessage(data);
    }
  });

  // При закрытии вкладки уведомляем сервер о выходе пользователя
  window.addEventListener('beforeunload', () => {
    if (socket && socket.readyState === WebSocket.OPEN && currentUser) {
      socket.send(JSON.stringify({
        type: 'exit',
        user: currentUser,
      }));
    }
  });
}

// Обработка формы выбора никнейма
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = nicknameInput.value.trim();
  if (!name) return;

  authError.classList.add('hidden');

  try {
    const response = await fetch(`${API_URL}/new-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    const result = await response.json();

    if (result.status === 'ok') {
      currentUser = result.user;
      authModal.classList.add('hidden');
      chatContainer.classList.remove('hidden');
      initWebSocket();
    } else {
      authError.textContent = result.message || 'Этот никнейм уже занят. Выберите другой.';
      authError.classList.remove('hidden');
    }
  } catch (err) {
    authError.textContent = 'Ошибка соединения с сервером.';
    authError.classList.remove('hidden');
  }
});

// Отправка сообщения
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;

  const payload = {
    type: 'send',
    message: text,
    user: currentUser,
  };

  socket.send(JSON.stringify(payload));
  messageInput.value = '';
});

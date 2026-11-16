const ROOM_ID = document.body.dataset.room;
const store = new RoomStore(ROOM_ID);

let playerId = sessionStorage.getItem(`zoom_pid_${ROOM_ID}`);
if (!playerId) {
  playerId = 'p_' + Math.random().toString(36).substring(2, 10);
  sessionStorage.setItem(`zoom_pid_${ROOM_ID}`, playerId);
}

let shieldActive = false;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('roomBadge').textContent = ROOM_ID.toUpperCase();

  // Entrar na sala
  document.getElementById('joinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('playerNameInput').value.trim();
    if (!name) return;

    await store.updateState((state) => {
      if (!state.players) state.players = {};

      let assignedCard = null;
      if (state.status === 'playing') {
        const usedCards = new Set(Object.values(state.players).map((p) => p.cardNumber).filter(Boolean));
        const available = [];
        for (let c = 1; c <= state.totalCards; c++) {
          if (!usedCards.has(c)) available.push(c);
        }
        if (available.length > 0) {
          assignedCard = available[Math.floor(Math.random() * available.length)];
        }
      }

      state.players[playerId] = {
        id: playerId,
        name,
        cardNumber: assignedCard,
        slotIndex: null
      };
      return state;
    });
  });

  // Botão de proteger tela (ocultar carta secreta)
  document.getElementById('toggleShieldBtn').addEventListener('click', () => {
    shieldActive = !shieldActive;
    const frame = document.getElementById('secretImageFrame');
    frame.classList.toggle('hidden-shield', shieldActive);
    document.getElementById('toggleShieldBtn').textContent = shieldActive
      ? '👁️ Mostrar Minha Carta'
      : '🙈 Ocultar Minha Carta';
  });

  // Ampliar carta secreta ao clicar (se não estiver oculta pelo escudo)
  document.getElementById('secretCardImg').addEventListener('click', (e) => {
    if (!shieldActive && e.target.src) {
      openImageLightbox(e.target.src, 'Sua Imagem Secreta');
    }
  });

  // Botão para sair / trocar nome
  const leaveBtn = document.getElementById('leaveRoomBtn');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', async () => {
      await store.updateState((state) => {
        if (state.players && state.players[playerId]) {
          delete state.players[playerId];
        }
        return state;
      });
    });
  }

  store.subscribe(renderPlayerView);
});

function renderPlayerView(state) {
  const me = state.players ? state.players[playerId] : null;
  const joinScreen = document.getElementById('joinScreen');
  const gameScreen = document.getElementById('gameScreen');
  const headerRight = document.getElementById('playerHeaderRight');

  if (!me) {
    joinScreen.style.display = 'block';
    gameScreen.style.display = 'none';
    if (headerRight) headerRight.style.display = 'none';
    return;
  }

  joinScreen.style.display = 'none';
  gameScreen.style.display = 'grid';
  if (headerRight) headerRight.style.display = 'flex';
  document.getElementById('playerNameHeader').textContent = `👤 ${me.name}`;

  // Banner de estado do tabuleiro (Travado / Revelado)
  const bannerEl = document.getElementById('boardStatusBanner');
  if (bannerEl) {
    if (state.status === 'revealed') {
      const playersList = Object.values(state.players || {});
      const correctCount = playersList.filter((p) => p.slotIndex !== null && p.cardNumber === p.slotIndex + 1).length;
      bannerEl.className = 'status-banner revealed';
      bannerEl.style.display = 'flex';
      bannerEl.innerHTML = `
        <span>✨ Cartas reveladas pelo facilitador!</span>
        <span>Pontuação da equipe: ${correctCount} de ${state.totalCards} corretas</span>
      `;
    } else if (state.locked) {
      bannerEl.className = 'status-banner locked';
      bannerEl.style.display = 'flex';
      bannerEl.innerHTML = `<span>🔒 O facilitador travou o tabuleiro. As posições não podem ser alteradas no momento.</span>`;
    } else {
      bannerEl.style.display = 'none';
    }
  }

  // Atualiza painel da Carta Secreta
  const secretImg = document.getElementById('secretCardImg');
  const secretFrame = document.getElementById('secretImageFrame');
  const secretStatus = document.getElementById('secretCardStatus');
  const toggleShieldBtn = document.getElementById('toggleShieldBtn');

  if (me.cardNumber) {
    secretFrame.style.display = 'block';
    toggleShieldBtn.style.display = 'inline-flex';
    secretImg.src = DECK_CONFIG.getCardUrl(me.cardNumber);
    secretImg.onerror = () => {
      secretImg.src = `https://placehold.co/400x400/0f172a/ffffff?text=Carta+Secreta`;
    };
    secretStatus.textContent = me.slotIndex !== null
      ? `Sua carta está na Posição #${me.slotIndex + 1}. Converse com a equipe para validar a ordem!`
      : 'Descreva os detalhes da sua imagem sem mostrar a tela e escolha uma posição ao lado.';
  } else {
    secretFrame.style.display = 'none';
    toggleShieldBtn.style.display = 'none';
    secretStatus.textContent = state.status === 'waiting'
      ? '⏳ Aguardando o facilitador iniciar a rodada e distribuir as cartas...'
      : 'Todas as cartas desta rodada já foram distribuídas.';
  }

  // Renderiza o tabuleiro compartilhado da sala
  const grid = document.getElementById('playerTimelineGrid');
  grid.innerHTML = '';
  const playersList = Object.values(state.players || {});
  const isRevealed = state.status === 'revealed';

  for (let i = 0; i < state.totalCards; i++) {
    const occupant = playersList.find((p) => p.slotIndex === i);
    const isMine = occupant && occupant.id === playerId;
    const isCorrect = isRevealed && occupant && occupant.cardNumber === i + 1;
    const isWrong = isRevealed && occupant && occupant.cardNumber !== i + 1;

    const slot = document.createElement('div');
    slot.className = `slot-card ${occupant ? 'occupied' : ''} ${isMine ? 'is-mine' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`;

    let previewClass = 'slot-preview empty-preview';
    let bodyHtml = `<span class="card-subtitle">Posição livre</span>`;

    if (occupant) {
      previewClass = 'slot-preview';
      if (isRevealed && occupant.cardNumber) {
        bodyHtml = `
          <img src="${DECK_CONFIG.getCardUrl(occupant.cardNumber)}" alt="Carta ${occupant.cardNumber}"
               onclick="openImageLightbox(this.src, 'Posição ${i + 1} — Carta #${occupant.cardNumber}')"
               onerror="this.src='https://placehold.co/300x300/0f172a/ffffff?text=Carta+${occupant.cardNumber}'">
        `;
      } else {
        bodyHtml = `
          <div class="card-back ${isMine ? 'mine' : ''}">
            <span>${isMine ? 'SUA CARTA' : 'CARTA SECRETA'}</span>
            <small style="opacity:0.85; font-weight:400; margin-top:4px;">${isMine ? 'Posicionada aqui' : 'Oculta'}</small>
          </div>
        `;
      }
    }

    let actionBtn = '';
    if (!isRevealed && !state.locked && me.cardNumber) {
      if (isMine) {
        actionBtn = `<button type="button" class="btn btn-outline btn-sm btn-block" onclick="claimSlot(null)">Remover daqui</button>`;
      } else {
        actionBtn = `<button type="button" class="btn ${occupant ? 'btn-outline' : 'btn-primary'} btn-sm btn-block" onclick="claimSlot(${i})">${occupant ? '⇄ Trocar posição' : 'Colocar aqui'}</button>`;
      }
    }

    let statusBadge = '';
    if (isRevealed && occupant) {
      statusBadge = `<span class="slot-hint-tag" style="color:${isCorrect ? 'var(--success)' : 'var(--danger)'}">${isCorrect ? '✅ Correta' : `❌ Era #${occupant.cardNumber}`}</span>`;
    }

    slot.innerHTML = `
      <div class="slot-header">
        <span class="slot-index-badge">POSIÇÃO ${i + 1}</span>
        ${statusBadge}
      </div>
      <div class="${previewClass}">${bodyHtml}</div>
      <div class="slot-player-name">
        ${occupant ? `👤 ${escapeHtml(occupant.name)}` : '—'}
      </div>
      ${actionBtn}
    `;
    grid.appendChild(slot);
  }
}

window.claimSlot = async function (targetIndex) {
  await store.updateState((state) => {
    if (state.locked || state.status === 'revealed') return state;
    const me = state.players[playerId];
    if (!me) return state;

    const previousSlot = me.slotIndex;
    const otherPlayer = Object.values(state.players).find((p) => p.slotIndex === targetIndex && p.id !== playerId);

    if (otherPlayer && targetIndex !== null) {
      otherPlayer.slotIndex = previousSlot;
    }

    me.slotIndex = targetIndex;
    return state;
  });
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}
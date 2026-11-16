let currentRoomId = 'sala-1';
let store = null;
let currentState = null;
let spyMode = false;

document.addEventListener('DOMContentLoaded', () => {
  initRoomTabs();
  initControls();
  switchRoom('sala-1');
});

function initRoomTabs() {
  document.querySelectorAll('.room-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.room-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      switchRoom(btn.dataset.room);
    });
  });
}

function switchRoom(roomId) {
  if (store) store.destroy();
  currentRoomId = roomId;
  store = new RoomStore(roomId);

  const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
  const playerUrl = `${baseUrl}${roomId}.html`;
  document.getElementById('playerLinkCode').textContent = playerUrl;
  document.getElementById('openPlayerTabBtn').href = `${roomId}.html`;

  store.subscribe((state) => {
    if (state.roomId !== currentRoomId) return;
    currentState = state;
    renderHostView(state);
  });
}

function initControls() {
  document.getElementById('startGameBtn').addEventListener('click', async () => {
    const count = parseInt(document.getElementById('cardCountInput').value, 10);
    if (isNaN(count) || count < 2 || count > DECK_CONFIG.maxCards) {
      return showToast(`Escolha entre 2 e ${DECK_CONFIG.maxCards} cartas.`);
    }

    await store.updateState((state) => {
      state.totalCards = count;
      state.status = 'playing';
      state.locked = false;

      const cardsPool = Array.from({ length: count }, (_, i) => i + 1);
      shuffleArray(cardsPool);

      const playerIds = Object.keys(state.players || {});
      playerIds.forEach((pid, idx) => {
        if (idx < cardsPool.length) {
          state.players[pid].cardNumber = cardsPool[idx];
          state.players[pid].slotIndex = null;
        } else {
          state.players[pid].cardNumber = null;
          state.players[pid].slotIndex = null;
        }
      });
      return state;
    });

    showToast(`Rodada iniciada na ${currentRoomId.toUpperCase()} com ${count} cartas!`);
  });

  document.getElementById('toggleSpyBtn').addEventListener('click', () => {
    spyMode = !spyMode;
    const spyBtn = document.getElementById('toggleSpyBtn');
    spyBtn.classList.toggle('active-toggle', spyMode);
    spyBtn.textContent = spyMode ? '🙈 Ocultar Gabarito' : '👁️ Ver Gabarito (Espião)';
    if (currentState) renderHostView(currentState);
  });

  document.getElementById('lockBoardBtn').addEventListener('click', async () => {
    await store.updateState((state) => {
      state.locked = !state.locked;
      return state;
    });
    showToast(currentState.locked ? '🔒 Tabuleiro travado!' : '🔓 Tabuleiro liberado para edições.');
  });

  document.getElementById('revealBtn').addEventListener('click', async () => {
    await store.updateState((state) => {
      state.status = 'revealed';
      state.locked = true;
      return state;
    });
    showToast('✨ Cartas reveladas para todos os jogadores da sala!');
  });

  document.getElementById('resetRoomBtn').addEventListener('click', async () => {
    if (!confirm(`Deseja zerar todos os jogadores e cartas da ${currentRoomId.toUpperCase()}?`)) return;
    await store.setState(store.getDefaultState());
    showToast('Sala resetada com sucesso.');
  });

  document.getElementById('copyLinkBtn').addEventListener('click', () => {
    const link = document.getElementById('playerLinkCode').textContent;
    navigator.clipboard.writeText(link);
    showToast('📋 Link da sala copiado!');
  });
}

window.removePlayer = async function (pid, playerName) {
  if (!confirm(`Remover "${playerName}" desta sala?`)) return;
  await store.updateState((state) => {
    if (state.players && state.players[pid]) {
      delete state.players[pid];
    }
    return state;
  });
  showToast(`${playerName} foi removido da sala.`);
};

function renderHostView(state) {
  const playersList = Object.values(state.players || {});
  const placedCount = playersList.filter((p) => p.slotIndex !== null && p.slotIndex !== undefined).length;

  document.getElementById('roomTitleDisplay').textContent = `Controle da ${currentRoomId.toUpperCase()}`;
  document.getElementById('playersCountBadge').textContent = `${playersList.length} jogador(es)`;
  document.getElementById('placementProgressText').textContent = `${placedCount} de ${state.totalCards} posições preenchidas`;

  const statusBadge = document.getElementById('roomStatusBadge');
  statusBadge.className = `badge badge-status ${state.status}`;
  const statusLabels = {
    waiting: '⏳ Aguardando distribuição',
    playing: state.locked ? '🔒 Em andamento (Travado)' : '🟢 Rodada em andamento',
    revealed: '✨ Cartas Reveladas'
  };
  statusBadge.textContent = statusLabels[state.status] || state.status;

  if (document.activeElement.id !== 'cardCountInput') {
    document.getElementById('cardCountInput').value = state.totalCards;
  }

  const lockBtn = document.getElementById('lockBoardBtn');
  lockBtn.textContent = state.locked ? '🔓 Destravar Tabuleiro' : '🔒 Travar Tabuleiro';
  lockBtn.classList.toggle('active-toggle', Boolean(state.locked));

  // Lista de jogadores conectados
  const rosterEl = document.getElementById('playersRoster');
  if (playersList.length === 0) {
    rosterEl.innerHTML = `<span class="card-subtitle">Aguardando participantes abrirem <strong>${currentRoomId}.html</strong>...</span>`;
  } else {
    rosterEl.innerHTML = playersList.map((p) => {
      const hasSlot = p.slotIndex !== null && p.slotIndex !== undefined;
      return `
        <span class="player-pill ${hasSlot ? 'placed' : ''}">
          <span>👤 ${escapeHtml(p.name)}</span>
          <small>${p.cardNumber ? `(Carta #${spyMode || state.status === 'revealed' ? p.cardNumber : '?'})` : '(Sem carta)'}</small>
          ${hasSlot ? `<strong>→ Pos. ${p.slotIndex + 1}</strong>` : ''}
          <button type="button" class="kick-btn" title="Remover jogador" onclick="removePlayer('${p.id}', '${escapeHtml(p.name)}')">×</button>
        </span>
      `;
    }).join('');
  }

  // Resumo de pontuação quando revelado
  const scoreEl = document.getElementById('scoreSummaryBadge');
  const isRevealed = state.status === 'revealed';
  if (isRevealed) {
    const correctCount = playersList.filter((p) => p.slotIndex !== null && p.cardNumber === p.slotIndex + 1).length;
    scoreEl.innerHTML = `<span class="badge badge-status revealed">🎯 Acertos da Equipe: ${correctCount} de ${state.totalCards}</span>`;
  } else {
    scoreEl.innerHTML = '';
  }

  // Renderiza Linha do Tempo
  const grid = document.getElementById('hostTimelineGrid');
  grid.innerHTML = '';

  for (let i = 0; i < state.totalCards; i++) {
    const occupant = playersList.find((p) => p.slotIndex === i);
    const isCorrect = isRevealed && occupant && occupant.cardNumber === i + 1;
    const isWrong = isRevealed && occupant && occupant.cardNumber !== i + 1;

    const slot = document.createElement('div');
    slot.className = `slot-card ${occupant ? 'occupied' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`;

    let previewClass = 'slot-preview empty-preview';
    let previewHtml = `<span class="card-subtitle">Posição vazia</span>`;

    if (occupant && occupant.cardNumber) {
      previewClass = 'slot-preview';
      if (isRevealed || spyMode) {
        const imgUrl = DECK_CONFIG.getCardUrl(occupant.cardNumber);
        previewHtml = `
          <img src="${imgUrl}" alt="Carta ${occupant.cardNumber}" 
               onclick="openImageLightbox(this.src, 'Carta #${occupant.cardNumber} — ${escapeHtml(occupant.name)}')"
               onerror="this.src='https://placehold.co/400x400/0f172a/ffffff?text=Carta+${occupant.cardNumber}'">
        `;
      } else {
        previewHtml = `
          <div class="card-back">
            <span>CARTA POSICIONADA</span>
            <small style="opacity:0.8; font-weight:400; margin-top:4px;">Oculta até a revelação</small>
          </div>
        `;
      }
    }

    let statusTag = '';
    if (isRevealed && occupant) {
      statusTag = `<span class="slot-hint-tag" style="color:${isCorrect ? 'var(--success)' : 'var(--danger)'}">${isCorrect ? '✅ Correta' : `❌ Era #${occupant.cardNumber}`}</span>`;
    } else if (!isRevealed && spyMode && occupant) {
      statusTag = `<span class="slot-hint-tag" style="color:var(--accent)">Gabarito: #${occupant.cardNumber}</span>`;
    }

    slot.innerHTML = `
      <div class="slot-header">
        <span class="slot-index-badge">POSIÇÃO ${i + 1}</span>
        ${statusTag}
      </div>
      <div class="${previewClass}">${previewHtml}</div>
      <div class="slot-player-name">
        ${occupant ? `👤 ${escapeHtml(occupant.name)}` : '—'}
      </div>
    `;
    grid.appendChild(slot);
  }
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}
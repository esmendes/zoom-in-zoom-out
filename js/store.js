class RoomStore {
  constructor(roomId) {
    this.roomId = roomId; // ex: 'sala-1', 'sala-2', 'sala-3', 'sala-4'
    this.storageKey = `zoom_game_${roomId}`;
    this.listeners = [];
    this.useFirebase = Boolean(FIREBASE_CONFIG && FIREBASE_CONFIG.databaseURL);
    this.dbRef = null;
    this.channel = null;

    this._onStorage = (e) => {
      if (e.key === this.storageKey && e.newValue) {
        this.notify(JSON.parse(e.newValue));
      }
    };

    if (this.useFirebase && window.firebase) {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      this.dbRef = firebase.database().ref(`rooms/${this.roomId}`);
      this._onFirebaseValue = (snapshot) => {
        const val = snapshot.val();
        if (val) this.notify(val);
      };
      this.dbRef.on('value', this._onFirebaseValue);
    } else {
      window.addEventListener('storage', this._onStorage);
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(this.storageKey);
        this.channel.onmessage = (e) => {
          if (e.data) this.notify(e.data);
        };
      }
    }
  }

  getDefaultState() {
    return {
      roomId: this.roomId,
      totalCards: 10,
      status: 'waiting', // 'waiting' | 'playing' | 'revealed'
      locked: false,
      players: {},
      updatedAt: Date.now()
    };
  }

  async getState() {
    if (this.useFirebase && this.dbRef) {
      const snap = await this.dbRef.once('value');
      return snap.val() || this.getDefaultState();
    }
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : this.getDefaultState();
  }

  async setState(newState) {
    newState.updatedAt = Date.now();
    if (this.useFirebase && this.dbRef) {
      await this.dbRef.set(newState);
    } else {
      localStorage.setItem(this.storageKey, JSON.stringify(newState));
      if (this.channel) this.channel.postMessage(newState);
      this.notify(newState);
    }
  }

  async updateState(mutatorFn) {
    const current = await this.getState();
    const cloned = typeof structuredClone === 'function'
      ? structuredClone(current)
      : JSON.parse(JSON.stringify(current));
    const updated = mutatorFn(cloned) || cloned;
    await this.setState(updated);
    return updated;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    this.getState().then((state) => callback(state));
  }

  notify(state) {
    this.listeners.forEach((cb) => cb(state));
  }

  destroy() {
    this.listeners = [];
    if (this.dbRef && this._onFirebaseValue) {
      this.dbRef.off('value', this._onFirebaseValue);
    }
    window.removeEventListener('storage', this._onStorage);
    if (this.channel) {
      this.channel.close();
    }
  }
}

function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3200);
}

function openImageLightbox(src, altText = 'Imagem ampliada') {
  if (!src) return;
  let backdrop = document.getElementById('imageLightbox');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'imageLightbox';
    backdrop.className = 'lightbox-backdrop';
    backdrop.innerHTML = `<img id="lightboxImg" src="" alt="" />`;
    backdrop.addEventListener('click', () => backdrop.classList.remove('open'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') backdrop.classList.remove('open');
    });
    document.body.appendChild(backdrop);
  }
  const img = document.getElementById('lightboxImg');
  img.src = src;
  img.alt = altText;
  backdrop.classList.add('open');
}
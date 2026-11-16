const DECK_CONFIG = {
  maxCards: 30,
  folder: 'cartas/',
  extension: 'jpg', // Altere para 'png' ou 'webp' se suas imagens estiverem nesses formatos
  
  // Gera automaticamente os caminhos cartas/01.jpg até cartas/30.jpg
  getCardUrl(index1Based) {
    const padded = String(index1Based).padStart(2, '0');
    return `${this.folder}${padded}.${this.extension}`;
  }
};

// Opcional: Cole aqui as credenciais do seu Firebase Realtime Database para rodar online entre PCs diferentes.
// Enquanto estiver vazio (null), funciona automaticamente via armazenamento local sincronizado entre abas.
const FIREBASE_CONFIG = JSON.parse(localStorage.getItem('zoom_firebase_config') || 'null');
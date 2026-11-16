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
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAfTKs3l5TVBXSiuYxvhgSrO14-VxwDOj4",
  authDomain: "zoom-in-zoom-out-6f06a.firebaseapp.com",
  databaseURL: "https://zoom-in-zoom-out-6f06a-default-rtdb.firebaseio.com",
  projectId: "zoom-in-zoom-out-6f06a",
  storageBucket: "zoom-in-zoom-out-6f06a.firebasestorage.app",
  messagingSenderId: "305990659832",
  appId: "1:305990659832:web:ac89d253ab5ef69132550d",
  measurementId: "G-JKWYJHXDGX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyB1ww7NxJ_Ku3EBKs8pnCtTUGxbGJkrU34",
    authDomain: "pro-landing-462018-g0.firebaseapp.com",
    projectId: "pro-landing-462018-g0",
    storageBucket: "pro-landing-462018-g0.firebasestorage.app",
    messagingSenderId: "1062503242769",
    appId: "1:1062503242769:web:b7fa991d8b2f2b75c5a5b0",
    measurementId: "G-SDH5VKH1X3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Essential: we need the youtube.force-ssl scope for exporting playlists
googleProvider.addScope('https://www.googleapis.com/auth/youtube.force-ssl');
googleProvider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline'
});

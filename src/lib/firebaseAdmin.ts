import { initializeApp, cert, getApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let projectId = process.env.FIREBASE_PROJECT_ID;
let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

let finalPrivateKey = "";

if (privateKeyRaw) {
  let key = privateKeyRaw.trim();
  key = key.replace(/\\n/g, "\n");
  key = key.replace(/^["']|["']$/g, "");

  const base64Part = key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  if (base64Part) {
    finalPrivateKey = `-----BEGIN PRIVATE KEY-----\n${base64Part}\n-----END PRIVATE KEY-----`;
  }
}

let app;
try {
  if (!projectId || !clientEmail || !finalPrivateKey) {
    console.warn("⚠️ Firebase: Credentials incomplete.", { 
      hasProject: !!projectId, 
      hasEmail: !!clientEmail, 
      hasKey: !!finalPrivateKey 
    });
    app = null;
  } else {
    const serviceAccount = {
      projectId,
      clientEmail,
      privateKey: finalPrivateKey,
    };

    app = getApps().length === 0
      ? initializeApp({
          credential: cert(serviceAccount as any),
        })
      : getApp();
    
    console.log("🚀 Firebase Admin SDK initialized successfully.");
  }
} catch (err: any) {
  console.error("❌ Firebase: Initialization failed!", err.message);
  app = null;
}

export const adminAuth = app ? getAuth(app) : {
  verifyIdToken: async () => { 
    throw new Error("Firebase Admin SDK was not initialized. Check server logs for details."); 
  }
} as any;

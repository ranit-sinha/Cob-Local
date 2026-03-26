/* ============================================
   COB LOCAL -- FIREBASE-CONFIG.JS
   Firebase + Supabase initialization
   Include this in every HTML file before
   any other scripts that need the database
   ============================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* -- FIREBASE CONFIG -- */
const firebaseConfig = {
  apiKey: "AIzaSyBWImyVA1cdcVqDIroz4HWfCH1KPBtpqgo",
  authDomain: "cob-local.firebaseapp.com",
  projectId: "cob-local",
  storageBucket: "cob-local.firebasestorage.app",
  messagingSenderId: "569113335311",
  appId: "1:569113335311:web:360695a028b62f4138357a"
};

/* -- SUPABASE CONFIG -- */
const SUPABASE_URL = "https://ftqcyjkhrgmsxfhuebme.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0cWN5amtocmdtc3hmaHVlYm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNjgyODYsImV4cCI6MjA4OTc0NDI4Nn0.LWKcRLPjZAZqWjeHvlpECDUe7135v1_qZ2zKfwl3Uu0";

/* -- INITIALIZE FIREBASE -- */
const app    = initializeApp(firebaseConfig);
const auth   = getAuth(app);
const db     = getFirestore(app);

/* -- SUPABASE HELPER FUNCTIONS -- */

async function supabaseGet(table, filters) {
  var url = SUPABASE_URL + "/rest/v1/" + table + "?select=*";
  if (filters) url += "&" + filters;
  var res = await fetch(url, {
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY
    }
  });
  return await res.json();
}

async function supabaseInsert(table, data) {
  var res = await fetch(SUPABASE_URL + "/rest/v1/" + table, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(data)
  });
  return res.ok;
}

async function supabaseUpdate(table, id, data) {
  var res = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?id=eq." + id, {
    method: "PATCH",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(data)
  });
  return res.ok;
}

async function supabaseDelete(table, id) {
  var res = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?id=eq." + id, {
    method: "DELETE",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY
    }
  });
  return res.ok;
}

async function supabaseUploadPhoto(filePath, base64Data, mimeType) {
  try {
    console.log("Uploading to path:", filePath);
    
    /* Convert base64 to blob */
    var byteString = atob(base64Data.split(',')[1]);
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    var blob = new Blob([ab], { type: mimeType || 'image/webp' });
    
    /* First try to upload using the correct storage endpoint */
    var uploadUrl = SUPABASE_URL + "/storage/v1/object/photos/" + filePath;
    
    var res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY
      },
      body: blob
    });
    
    console.log("Upload response status:", res.status);
    
    if (!res.ok) {
      // If file exists, try PUT
      res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY
        },
        body: blob
      });
      console.log("PUT response status:", res.status);
    }
    
    if (res.ok) {
      // Return the public URL
      var publicUrl = SUPABASE_URL + "/storage/v1/object/public/photos/" + filePath + "?t=" + Date.now();
      console.log("Upload successful, public URL:", publicUrl);
      return publicUrl;
    } else {
      const errorText = await res.text();
      console.error("Upload failed with status:", res.status, "Error:", errorText);
      return null;
    }
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
}

/* -- PHONE TO EMAIL HELPER -- */
function phoneToEmail(phone) {
  return phone + "@coblocal.app";
}

/* -- EXPORT EVERYTHING -- */
window.firebaseAuth    = auth;
window.firebaseDb      = db;
window.supabaseGet     = supabaseGet;
window.supabaseInsert  = supabaseInsert;
window.supabaseUpdate  = supabaseUpdate;
window.supabaseDelete  = supabaseDelete;
window.supabaseUploadPhoto = supabaseUploadPhoto;
window.phoneToEmail    = phoneToEmail;
window.firebaseSignOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signInWithEmailAndPassword     = signInWithEmailAndPassword;
window.firestoreDoc      = doc;
window.firestoreSetDoc   = setDoc;
window.firestoreGetDoc   = getDoc;
window.firestoreGetDocs  = getDocs;
window.firestoreCollection = collection;
window.firestoreQuery    = query;
window.firestoreWhere    = where;
window.firestoreOrderBy  = orderBy;
window.firestoreAddDoc   = addDoc;
window.firestoreUpdateDoc = updateDoc;
window.firestoreDeleteDoc = deleteDoc;

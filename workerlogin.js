/* COBLOCAL -- WORKER-LOGIN.JS */

var WORKER_SESSION = "ctj_worker_session";
var SB_URL = "https://ftqcyjkhrgmsxfhuebme.supabase.co";
var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0cWN5amtocmdtc3hmaHVlYm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNjgyODYsImV4cCI6MjA4OTc0NDI4Nn0.LWKcRLPjZAZqWjeHvlpECDUe7135v1_qZ2zKfwl3Uu0";

async function findWorkerById(id) {
  var results = await window.supabaseGet("workers", "id=eq." + id);
  if (results && results.length > 0) return results[0];
  return null;
}

function workerFromSupabase(w) {
  return {
    id: w.id,
    name: w.name,
    providerType: w.provider_type,
    businessType: w.business_type,
    skill: w.skill,
    subSkill: w.sub_skill,
    phone: w.phone,
    available: w.available,
    hasSmartphone: w.has_smartphone,
    hasWhatsApp: w.has_whatsapp,
    aadhaarVerified: w.aadhaar_verified,
    photoURL: w.photo_url,
    averageRating: w.average_rating,
    totalFeedbacks: w.total_feedbacks,
    address: w.address,
    bio: w.bio,
    workingHours: w.working_hours,
    socialLinks: w.social_links || [],
    createdAt: w.created_at
  };
}

function renderWorkerDashboard(worker) {
  document.getElementById("loginCard").style.display       = "none";
  document.getElementById("workerDashboard").style.display = "block";

  var photoEl = document.getElementById("dashPhoto");
  if (worker.photoURL) {
    photoEl.innerHTML = '<img src="' + worker.photoURL + '" alt="">';
  } else {
    photoEl.textContent = worker.name.charAt(0).toUpperCase();
  }

  document.getElementById("dashName").textContent  = worker.name;
  document.getElementById("dashSkill").textContent = worker.subSkill
    ? worker.skill + " | " + worker.subSkill : worker.skill;
  document.getElementById("dashAvailable").checked = worker.available;
  var live = getLiveRating(worker.id);
  document.getElementById("dashRating").textContent  = (live.total >= 1 && live.avg > 0) ? live.avg.toFixed(1) : "-";
  document.getElementById("dashReviews").textContent = live.total;
  var lvObj = getLevelFromRating(live.avg, live.total);
  document.getElementById("dashLevel").textContent   = lvObj ? lvObj.name : "New";
  document.getElementById("viewProfileBtn").href = "workerprofile.html?id=" + worker.id;
}

async function submitWorkerLogin() {
  var phone = document.getElementById("loginPhone").value.trim();
  var pw    = document.getElementById("loginPw").value;

  document.getElementById("errPhone").textContent   = "";
  document.getElementById("errPw").textContent      = "";
  document.getElementById("errGeneral").textContent = "";

  var ok = true;
  if (!phone || !/^[0-9]{10}$/.test(phone)) {
    document.getElementById("errPhone").textContent = "Enter a valid 10-digit number";
    ok = false;
  }
  if (!pw) {
    document.getElementById("errPw").textContent = "Enter your password";
    ok = false;
  }
  if (!ok) return;

  try {
    var emailForAuth = window.phoneToEmail(phone);
    var userCred = await window.signInWithEmailAndPassword(window.firebaseAuth, emailForAuth, pw);
    var uid = userCred.user.uid;

    var workerRaw = await findWorkerById(uid);
    if (!workerRaw) {
      document.getElementById("errGeneral").textContent = "Provider profile not found";
      return;
    }

    var worker = workerFromSupabase(workerRaw);
    localStorage.setItem(WORKER_SESSION, uid);
    showToast("Welcome back, " + worker.name.split(" ")[0] + "!");
    renderWorkerDashboard(worker);

  } catch(err) {
    console.error("Login error:", err);
    document.getElementById("errGeneral").textContent = "Invalid mobile number or password";
  }
}

async function updateAvailability() {
  var id      = localStorage.getItem(WORKER_SESSION);
  var checked = document.getElementById("dashAvailable").checked;
  await window.supabaseUpdate("workers", id, { available: checked });
  showToast(checked ? "Status: Available" : "Status: Busy");
}

function logoutWorker() {
  window.firebaseSignOut(window.firebaseAuth);
  localStorage.removeItem(WORKER_SESSION);
  document.getElementById("workerDashboard").style.display = "none";
  document.getElementById("loginCard").style.display       = "block";
  document.getElementById("loginPhone").value = "";
  document.getElementById("loginPw").value    = "";
  showToast("Logged out");
}

function showDeleteWorkerModal() {
  document.getElementById("deleteWorkerPw").value = "";
  document.getElementById("deleteWorkerErr").textContent = "";
  document.getElementById("deleteWorkerModal").style.display = "flex";
}

function hideDeleteWorkerModal() {
  document.getElementById("deleteWorkerModal").style.display = "none";
}

async function deleteStorageFolder(workerId) {
  /* Delete profile photo */
  try {
    await fetch(SB_URL + "/storage/v1/object/photos/profiles/" + workerId + "/photo.webp", {
      method: "DELETE",
      headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY }
    });
  } catch(e) {}
  /* Delete aadhaar photos â€” list and delete all */
  try {
    var listRes = await fetch(SB_URL + "/storage/v1/object/list/photos/aadhaar/" + workerId, {
      method: "POST",
      headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 100, offset: 0 })
    });
    if (listRes.ok) {
      var files = await listRes.json();
      for (var i = 0; i < files.length; i++) {
        await fetch(SB_URL + "/storage/v1/object/photos/aadhaar/" + workerId + "/" + files[i].name, {
          method: "DELETE",
          headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY }
        });
      }
    }
  } catch(e) {}
}

async function confirmDeleteWorker() {
  var pw = document.getElementById("deleteWorkerPw").value;
  var errEl = document.getElementById("deleteWorkerErr");
  errEl.textContent = "";

  if (!pw) { errEl.textContent = "Enter your password"; return; }

  var workerId = localStorage.getItem(WORKER_SESSION);
  if (!workerId) { errEl.textContent = "Session error. Please login again."; return; }

  try {
    /* Re-authenticate to verify password */
    var workerRaw = await findWorkerById(workerId);
    if (!workerRaw) { errEl.textContent = "Profile not found"; return; }
    var emailForAuth = window.phoneToEmail(workerRaw.phone);
    await window.signInWithEmailAndPassword(window.firebaseAuth, emailForAuth, pw);

    /* Delete photos from Supabase Storage */
    await deleteStorageFolder(workerId);

    /* Delete from Supabase workers table */
    await window.supabaseDelete("workers", workerId);

    /* Delete Firebase auth user */
    await window.firebaseAuth.currentUser.delete();

    localStorage.removeItem(WORKER_SESSION);
    showToast("Provider profile deleted");
    setTimeout(function() { window.location.href = "index.html"; }, 1200);

  } catch(err) {
    console.error("Delete error:", err);
    errEl.textContent = "Incorrect password";
  }
}

function togglePw(inputId, iconId) {
  var input = document.getElementById(inputId);
  var icon  = document.getElementById(iconId);
  if (input.type === "password") {
    input.type = "text";
    icon.className = "fa-regular fa-eye-slash";
  } else {
    input.type = "password";
    icon.className = "fa-regular fa-eye";
  }
}

document.addEventListener("DOMContentLoaded", async function() {
  var session = localStorage.getItem(WORKER_SESSION);
  if (session) {
    var workerRaw = await findWorkerById(session);
    if (workerRaw) {
      renderWorkerDashboard(workerFromSupabase(workerRaw));
      return;
    }
    localStorage.removeItem(WORKER_SESSION);
  }
});
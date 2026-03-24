/* COBLOCAL -- HIRER-AUTH.JS */

var HIRER_SESSION = "ctj_hirer_session";

function switchTab(tab) {
  var lCard  = document.getElementById("loginCard");
  var sCard  = document.getElementById("signupCard");
  var tLogin = document.getElementById("tabLogin");
  var tSignup= document.getElementById("tabSignup");
  if (tab === "login") {
    lCard.style.display  = "block";
    sCard.style.display  = "none";
    tLogin.classList.add("active");
    tSignup.classList.remove("active");
  } else {
    lCard.style.display  = "none";
    sCard.style.display  = "block";
    tSignup.classList.add("active");
    tLogin.classList.remove("active");
  }
}

function renderHirerDashboard(hirer) {
  document.getElementById("authTabs").style.display      = "none";
  document.getElementById("loginCard").style.display     = "none";
  document.getElementById("signupCard").style.display    = "none";
  document.getElementById("hirerDashboard").style.display = "block";
  var avatarEl = document.getElementById("hirerAvatar");
  if (hirer.photoURL) {
    avatarEl.innerHTML = '<img src="' + hirer.photoURL + '" style="width:100%;height:100%;object-fit:cover;">';
    avatarEl.style.background = "none";
  } else {
    avatarEl.textContent = hirer.name.charAt(0).toUpperCase();
  }
  document.getElementById("hirerDashName").textContent = hirer.name;
}

async function submitHirerLogin() {
  var phone = document.getElementById("hLoginPhone").value.trim();
  var pw    = document.getElementById("hLoginPw").value;

  document.getElementById("hLoginErrPhone").textContent   = "";
  document.getElementById("hLoginErrPw").textContent      = "";
  document.getElementById("hLoginErrGeneral").textContent = "";

  var ok = true;
  if (!phone || !/^[0-9]{10}$/.test(phone)) {
    document.getElementById("hLoginErrPhone").textContent = "Enter a valid 10-digit number";
    ok = false;
  }
  if (!pw) {
    document.getElementById("hLoginErrPw").textContent = "Enter your password";
    ok = false;
  }
  if (!ok) return;

  try {
    var emailForAuth = window.phoneToEmail("h_" + phone);
    var userCred = await window.signInWithEmailAndPassword(window.firebaseAuth, emailForAuth, pw);
    var uid = userCred.user.uid;

    var hirerDoc = await window.firestoreGetDoc(window.firestoreDoc(window.firebaseDb, "hirers", uid));
    if (!hirerDoc.exists()) {
      document.getElementById("hLoginErrGeneral").textContent = "Account not found";
      return;
    }
    var hirer = hirerDoc.data();
    localStorage.setItem(HIRER_SESSION, uid);
    localStorage.setItem("ctj_hirer_phone", phone);
    showToast("Welcome back, " + hirer.name.split(" ")[0] + "!");
    renderHirerDashboard(hirer);

  } catch(err) {
    console.error("Hirer login error:", err);
    document.getElementById("hLoginErrGeneral").textContent = "Invalid mobile number or password";
  }
}

async function submitHirerSignup() {
  var name  = document.getElementById("hSignupName").value.trim();
  var phone = document.getElementById("hSignupPhone").value.trim();
  var pw    = document.getElementById("hSignupPw").value;
  var pw2   = document.getElementById("hSignupPw2").value;

  document.getElementById("hSignupErrName").textContent    = "";
  document.getElementById("hSignupErrPhone").textContent   = "";
  document.getElementById("hSignupErrPw").textContent      = "";
  document.getElementById("hSignupErrPw2").textContent     = "";
  document.getElementById("hSignupErrGeneral").textContent = "";

  var ok = true;
  if (!name || name.length < 2) {
    document.getElementById("hSignupErrName").textContent = "Enter your full name";
    ok = false;
  }
  if (!phone || !/^[0-9]{10}$/.test(phone)) {
    document.getElementById("hSignupErrPhone").textContent = "Enter a valid 10-digit number";
    ok = false;
  }
  if (!pw || pw.length < 6) {
    document.getElementById("hSignupErrPw").textContent = "Password must be at least 6 characters";
    ok = false;
  }
  if (pw !== pw2) {
    document.getElementById("hSignupErrPw2").textContent = "Passwords do not match";
    ok = false;
  }
  if (!ok) return;

  try {
    var emailForAuth = window.phoneToEmail("h_" + phone);
    var userCred = await window.createUserWithEmailAndPassword(window.firebaseAuth, emailForAuth, pw);
    var uid = userCred.user.uid;

    var hirer = { name: name, phone: phone, createdAt: Date.now() };
    await window.firestoreSetDoc(window.firestoreDoc(window.firebaseDb, "hirers", uid), hirer);

    localStorage.setItem(HIRER_SESSION, uid);
    localStorage.setItem("ctj_hirer_phone", phone);
    showToast("Welcome, " + name.split(" ")[0] + "!");
    renderHirerDashboard(hirer);

  } catch(err) {
    console.error("Signup error:", err);
    if (err.code === "auth/email-already-in-use") {
      document.getElementById("hSignupErrGeneral").textContent = "This number is already registered as a customer.";
    } else {
      document.getElementById("hSignupErrGeneral").textContent = "Signup failed. Please try again.";
    }
  }
}

function logoutHirer() {
  window.firebaseSignOut(window.firebaseAuth);
  localStorage.removeItem(HIRER_SESSION);
  localStorage.removeItem("ctj_hirer_phone");
  document.getElementById("hirerDashboard").style.display = "none";
  document.getElementById("authTabs").style.display       = "flex";
  document.getElementById("loginCard").style.display      = "block";
  document.getElementById("hLoginPhone").value = "";
  document.getElementById("hLoginPw").value    = "";
  showToast("Logged out");
}

function showDeleteHirerModal() {
  document.getElementById("deleteHirerPw").value = "";
  document.getElementById("deleteHirerErr").textContent = "";
  document.getElementById("deleteHirerModal").style.display = "flex";
}

function hideDeleteHirerModal() {
  document.getElementById("deleteHirerModal").style.display = "none";
}

async function confirmDeleteHirer() {
  var pw = document.getElementById("deleteHirerPw").value;
  var errEl = document.getElementById("deleteHirerErr");
  errEl.textContent = "";

  if (!pw) { errEl.textContent = "Enter your password"; return; }

  var uid = localStorage.getItem(HIRER_SESSION);
  var phone = localStorage.getItem("ctj_hirer_phone");
  if (!uid || !phone) { errEl.textContent = "Session error. Please login again."; return; }

  try {
    var emailForAuth = window.phoneToEmail("h_" + phone);
    await window.signInWithEmailAndPassword(window.firebaseAuth, emailForAuth, pw);

    await window.firestoreDeleteDoc(window.firestoreDoc(window.firebaseDb, "hirers", uid));
    await window.firebaseAuth.currentUser.delete();

    localStorage.removeItem(HIRER_SESSION);
    localStorage.removeItem("ctj_hirer_phone");
    showToast("Customer profile deleted");
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
  var session = localStorage.getItem(HIRER_SESSION);
  if (session) {
    try {
      var hirerDoc = await window.firestoreGetDoc(window.firestoreDoc(window.firebaseDb, "hirers", session));
      if (hirerDoc.exists()) {
        renderHirerDashboard(hirerDoc.data());
        return;
      }
    } catch(err) { console.error(err); }
    localStorage.removeItem(HIRER_SESSION);
  }
});
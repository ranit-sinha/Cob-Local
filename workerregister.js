/* COBLOCAL -- WORKER-REGISTER.JS */

var currentStep = 1;
var currentProviderType = "worker";
var socialLinks = [];

var SUB_OPTIONS = {
  "Tutor":      ["Study", "Drawing", "Singing", "Dance", "Instrument", "Recitation"],
  "Driver":     ["Car", "Bus", "Toto"],
  "Institutes": ["Private Teaching / Coaching", "Singing Classes", "Dance Classes", "Modeling / Acting", "Art & Drawing", "Music Instrument", "Sports Academy", "Others"],
  "Shops":      ["Medical Shop", "Mobile Repair", "Bike / Vehicle Repair", "Catering", "Decoration", "Event Management", "Gym", "Others"]
};

var BUSINESS_SUB_OPTIONS = {
  "Shop":      ["Medical Shop", "Mobile Repair", "Bike / Vehicle Repair", "Catering", "Decoration", "Gym", "General Shop", "Others"],
  "Agency":    ["Event Management", "Catering Agency", "Decoration Agency", "Travel Agency", "Others"],
  "Institute": ["Private Teaching / Coaching", "Singing Classes", "Dance Classes", "Modeling / Acting", "Art & Drawing", "Music Instrument", "Sports Academy", "Others"]
};

function selectProviderType(type) {
  currentProviderType = type;
  document.getElementById("typeWorkerBtn").className = "type-select-btn" + (type === "worker" ? " type-active" : "");
  document.getElementById("typeBusinessBtn").className = "type-select-btn" + (type === "business" ? " type-active" : "");
  document.getElementById("workerOnlyFields").style.display = type === "worker" ? "block" : "none";
  document.getElementById("businessOnlyFields").style.display = type === "business" ? "block" : "none";
  document.getElementById("businessTypeGroup").style.display = type === "business" ? "block" : "none";
  var workerSvcGroup = document.getElementById("workerServiceGroup");
  if (workerSvcGroup) workerSvcGroup.style.display = type === "business" ? "none" : "block";
  if (type === "worker") {
    document.getElementById("subSkillGroup").style.display = "none";
    document.getElementById("otherSkillGroup").style.display = "none";
  }
  document.getElementById("nameLabel").textContent = type === "worker" ? "Full Name" : "Business Name";
  document.getElementById("regName").placeholder = type === "worker" ? "Enter your full name" : "Enter business name";
  document.getElementById("providerTypeHint").textContent = type === "worker"
    ? "Single person providing a service (tutor, driver, etc.)"
    : "Shop, agency, or institute with a business name";
  var aadhaarGroup = document.getElementById("aadhaarCardLabel");
  if (aadhaarGroup) {
    var parentGroup = aadhaarGroup.parentElement;
    if (parentGroup) parentGroup.style.display = type === "business" ? "none" : "block";
  }
}

function handleBusinessCategoryChange() {
  var cat = document.getElementById("regBusinessCategory").value;
  var subGroup = document.getElementById("businessSubTypeGroup");
  var subSelect = document.getElementById("regBusinessSubType");
  document.getElementById("businessOtherSubGroup").style.display = "none";
  if (cat && BUSINESS_SUB_OPTIONS[cat]) {
    subGroup.style.display = "block";
    subSelect.innerHTML = '<option value="">-- Select --</option>'
      + BUSINESS_SUB_OPTIONS[cat].map(function(s) {
          return '<option value="' + s + '">' + s + '</option>';
        }).join("");
  } else {
    subGroup.style.display = "none";
  }
}

function handleBusinessSubTypeChange() {
  var val = document.getElementById("regBusinessSubType").value;
  document.getElementById("businessOtherSubGroup").style.display = val === "Others" ? "block" : "none";
}

function addSocialLink() {
  var platform = document.getElementById("socialPlatform").value;
  var url = document.getElementById("socialLinkInput").value.trim();
  if (!url) { showToast("Enter a link first"); return; }
  if (!url.startsWith("http")) url = "https://" + url;
  socialLinks.push({ platform: platform, url: url });
  document.getElementById("socialLinkInput").value = "";
  renderSocialTags();
}

function removeSocialLink(idx) {
  socialLinks.splice(idx, 1);
  renderSocialTags();
}

function renderSocialTags() {
  var container = document.getElementById("socialTagsContainer");
  if (!container) return;
  container.innerHTML = socialLinks.map(function(link, i) {
    return '<span class="social-tag"><i class="' + getSocialIcon(link.platform) + '"></i> '
      + link.platform
      + '<button type="button" class="social-tag-remove" onclick="removeSocialLink(' + i + ')">\u2715</button></span>';
  }).join("");
}

function getSocialIcon(platform) {
  var icons = {
    Instagram: "fa-brands fa-instagram",
    Facebook:  "fa-brands fa-facebook",
    YouTube:   "fa-brands fa-youtube",
    WhatsApp:  "fa-brands fa-whatsapp",
    Website:   "fa-solid fa-globe",
    Other:     "fa-solid fa-link"
  };
  return icons[platform] || "fa-solid fa-link";
}

function goStep(n) {
  if (n > currentStep && !validateStep(currentStep)) return;
  var prev = document.getElementById("stepDot" + currentStep);
  if (prev) { prev.classList.remove("active"); if (n > currentStep) prev.classList.add("done"); }
  [1,2,3,4].forEach(function(i) {
    var el = document.getElementById("step" + i);
    if (el) el.style.display = "none";
  });
  currentStep = n;
  var el = document.getElementById("step" + n);
  if (el) el.style.display = "block";
  var dot = document.getElementById("stepDot" + n);
  if (dot) { dot.classList.add("active"); dot.classList.remove("done"); }
  window.scrollTo(0, 0);
}

function validateStep(s) {
  var ok = true;
  if (s === 1) {
    var name = document.getElementById("regName").value.trim();
    setErr("errName", ""); setErr("errAge", ""); setErr("errGender", ""); setErr("errContactPerson", "");
    if (!name || name.length < 2) { setErr("errName", "Enter a valid name"); ok = false; }
    if (currentProviderType === "worker") {
      var age = parseInt(document.getElementById("regAge").value, 10);
      var gender = document.querySelector('input[name="regGender"]:checked');
      if (!document.getElementById("regAge").value || isNaN(age) || age < 16 || age > 80) { setErr("errAge", "Enter a valid age (16-80)"); ok = false; }
      if (!gender) { setErr("errGender", "Select your gender"); ok = false; }
    } else {
      var contactPerson = document.getElementById("regContactPerson").value.trim();
      if (!contactPerson || contactPerson.length < 2) { setErr("errContactPerson", "Enter contact person name"); ok = false; }
    }
  }
  if (s === 2) {
    var hours = document.getElementById("regHours").value.trim();
    setErr("errSkill", ""); setErr("errHours", ""); setErr("errOtherSkill", ""); setErr("errBusinessCategory", "");
    if (currentProviderType === "business") {
      var bizCat = document.getElementById("regBusinessCategory").value;
      if (!bizCat) { setErr("errBusinessCategory", "Select a business category"); ok = false; }
    } else {
      var skill = document.getElementById("regSkill").value;
      if (!skill) { setErr("errSkill", "Select a skill"); ok = false; }
      if (skill === "Others" && !document.getElementById("regOtherSkill").value.trim()) { setErr("errOtherSkill", "Specify your skill"); ok = false; }
    }
    if (!hours) { setErr("errHours", "Enter your working hours"); ok = false; }
  }
  if (s === 3) {
    var phone = document.getElementById("regPhone").value.trim();
    var pw = document.getElementById("regPw").value;
    var pw2 = document.getElementById("regPw2").value;
    setErr("errPhone", ""); setErr("errPw", ""); setErr("errPw2", "");
    if (!phone || !/^[0-9]{10}$/.test(phone)) { setErr("errPhone", "Enter a valid 10-digit number"); ok = false; }
    if (!pw || pw.length < 6) { setErr("errPw", "Password must be at least 6 characters"); ok = false; }
    if (pw !== pw2) { setErr("errPw2", "Passwords do not match"); ok = false; }
  }
  return ok;
}

function setErr(id, msg) {
  var el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function handleSkillChange() {
  var skill = document.getElementById("regSkill").value;
  document.getElementById("subSkillGroup").style.display = "none";
  document.getElementById("otherSkillGroup").style.display = "none";
  if (skill === "Others") { document.getElementById("otherSkillGroup").style.display = "block"; return; }
  if (SUB_OPTIONS[skill]) {
    document.getElementById("subSkillGroup").style.display = "block";
    document.getElementById("regSubSkill").innerHTML = '<option value="">-- Select --</option>' +
      SUB_OPTIONS[skill].map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join("");
  }
}

function handlePhotoUpload(input) {
  if (!input.files || !input.files[0]) return;
  if (input.files[0].size > 2 * 1024 * 1024) { showToast("Photo must be under 2MB"); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement("canvas");
      var maxW = 400;
      var scale = img.width > maxW ? maxW / img.width : 1;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      var compressed = canvas.toDataURL("image/webp", 0.7);
      document.getElementById("photoPreview").src = compressed;
      document.getElementById("photoPreview").style.display = "block";
      document.getElementById("photoPlaceholder").style.display = "none";
      showToast("Photo ready (" + Math.round((compressed.length * 3) / 4 / 1024) + " KB)");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

function handleAadhaarUpload(input) {
  if (!input.files || !input.files[0]) return;
  var box = document.getElementById("aadhaarBox");
  box.classList.add("uploaded");
  document.getElementById("aadhaarLabel").textContent = input.files[0].name;
  var reader = new FileReader();
  reader.onload = function(e) { window._aadhaarPhotoData = e.target.result; };
  reader.readAsDataURL(input.files[0]);
}

function toggleRegPw(inputId, iconId) {
  var input = document.getElementById(inputId);
  var icon = document.getElementById(iconId);
  if (input.type === "password") { input.type = "text"; icon.className = "fa-regular fa-eye-slash"; }
  else { input.type = "password"; icon.className = "fa-regular fa-eye"; }
}

async function submitRegistration() {
  if (!validateStep(3)) { goStep(3); return; }
  setErr("errTerms", "");
  if (!document.getElementById("regTerms").checked) {
    setErr("errTerms", "Please confirm the information is accurate");
    return;
  }

  var submitBtn = document.querySelector(".reg-btn-accent[onclick='submitRegistration()']");
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Registering..."; }

  var isBusiness = currentProviderType === "business";
  var bizCat = isBusiness ? document.getElementById("regBusinessCategory").value : "";
  var bizSubType = isBusiness ? document.getElementById("regBusinessSubType").value : "";
  var phoneType = document.querySelector('input[name="regPhoneType"]:checked').value;
  var hasSmartphone = phoneType === "smartphone";
  var preview = document.getElementById("photoPreview");
  var photoData = (preview && preview.style.display !== "none") ? preview.src : "";
  var phone = document.getElementById("regPhone").value.trim();
  var pw = document.getElementById("regPw").value;

  var businessSkillMap = { "Shop": "Shops", "Agency": "Shops", "Institute": "Institutes" };
  var skill = isBusiness ? (businessSkillMap[bizCat] || "Shops") : document.getElementById("regSkill").value;
  var subSkill = isBusiness ? bizSubType : (skill === "Others"
    ? document.getElementById("regOtherSkill").value.trim()
    : document.getElementById("regSubSkill").value);

  /* STEP 1: Firebase Auth */
  var uid;
  try {
    var emailForAuth = window.phoneToEmail(phone);
    var userCred = await window.createUserWithEmailAndPassword(window.firebaseAuth, emailForAuth, pw);
    uid = userCred.user.uid;
  } catch(err) {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Register Now"; }
    if (err.code === "auth/email-already-in-use") {
      setErr("errPhone", "This number is already registered. Please login instead.");
      goStep(3);
    } else {
      setErr("errTerms", "Step1 Firebase error: " + err.code);
    }
    return;
  }

  /* STEP 2: Upload photo */
  var photoURL = "";
  if (photoData) {
    var photoPath = "profiles/" + uid + "/photo.webp";
    var uploaded = await window.supabaseUploadPhoto(photoPath, photoData, "image/webp");
    if (uploaded) photoURL = uploaded;
  }

  /* STEP 3: Supabase insert */
  var workerRow = {
    id:               uid,
    name:             document.getElementById("regName").value.trim(),
    provider_type:    currentProviderType,
    business_type:    bizCat,
    business_sub_type: bizSubType,
    contact_person:   isBusiness ? document.getElementById("regContactPerson").value.trim() : "",
    age:              isBusiness ? null : parseInt(document.getElementById("regAge").value, 10),
    gender:           isBusiness ? "" : (document.querySelector('input[name="regGender"]:checked') ? document.querySelector('input[name="regGender"]:checked').value : ""),
    bio:              document.getElementById("regBio").value.trim(),
    address:          document.getElementById("regAddress").value.trim(),
    skill:            skill,
    sub_skill:        subSkill,
    working_hours:    document.getElementById("regHours").value.trim(),
    available:        document.getElementById("regAvailable").checked,
    phone:            phone,
    has_smartphone:   hasSmartphone,
    has_whatsapp:     hasSmartphone && document.getElementById("regWhatsapp").checked,
    aadhaar_verified: false,
    social_links:     socialLinks.slice(),
    photo_url:        photoURL,
    average_rating:   0,
    total_feedbacks:  0,
    created_at:       Date.now()
  };

  /* Direct fetch so we can see the exact Supabase error */
  var sbKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0cWN5amtocmdtc3hmaHVlYm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNjgyODYsImV4cCI6MjA4OTc0NDI4Nn0.LWKcRLPjZAZqWjeHvlpECDUe7135v1_qZ2zKfwl3Uu0";
  var sbRes = await fetch("https://ftqcyjkhrgmsxfhuebme.supabase.co/rest/v1/workers", {
    method: "POST",
    headers: {
      "apikey": sbKey,
      "Authorization": "Bearer " + sbKey,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(workerRow)
  });

  if (!sbRes.ok) {
    var errText = await sbRes.text();
    try { await window.firebaseAuth.currentUser.delete(); } catch(e) {}
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Register Now"; }
    setErr("errTerms", "DB " + sbRes.status + ": " + errText);
    return;
  }

  /* STEP 4: Aadhaar */
  if (!isBusiness && window._aadhaarPhotoData) {
    try {
      var aadhaarPath = "aadhaar/" + uid + "/aadhaar.jpg";
      var aadhaarURL = await window.supabaseUploadPhoto(aadhaarPath, window._aadhaarPhotoData, "image/jpeg");
      if (aadhaarURL) {
        await window.firestoreSetDoc(
          window.firestoreDoc(window.firebaseDb, "aadhaar_pending", uid),
          { workerId: uid, aadhaarUrl: aadhaarURL, status: "pending", createdAt: Date.now() }
        );
      }
    } catch(err) { console.error("Aadhaar upload error:", err); }
  }

  /* STEP 5: Auto-login and show success */
  localStorage.setItem("ctj_worker_session", uid);
  [1,2,3,4].forEach(function(i) {
    var el = document.getElementById("step" + i);
    if (el) el.style.display = "none";
  });
  var dot4 = document.getElementById("stepDot4");
  if (dot4) { dot4.classList.remove("active"); dot4.classList.add("done"); }
  document.getElementById("stepSuccess").style.display = "block";
  window.scrollTo(0, 0);
}

document.addEventListener("DOMContentLoaded", function() {
  var bioEl = document.getElementById("regBio");
  var countEl = document.getElementById("bioCount");
  if (bioEl && countEl) {
    bioEl.addEventListener("input", function() {
      countEl.textContent = bioEl.value.length + " / 200";
    });
  }
  document.querySelectorAll('input[name="regPhoneType"]').forEach(function(r) {
    r.addEventListener("change", function() {
      document.getElementById("whatsappGroup").style.display = this.value === "basic" ? "none" : "block";
    });
  });
});
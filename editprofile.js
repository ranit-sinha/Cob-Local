/* COBLOCAL -- EDITPROFILE.JS */

var editUserType  = null;
var editWorkerData = null;
var editHirerUid = null;

document.addEventListener("DOMContentLoaded", async function() {
  var workerSession = localStorage.getItem("ctj_worker_session");
  var hirerSession  = localStorage.getItem("ctj_hirer_session");

  if (!workerSession && !hirerSession) {
    show("notLoggedIn");
    return;
  }

  if (workerSession) {
    editUserType = "worker";
    await loadWorkerEdit(workerSession);
  } else {
    editUserType = "hirer";
    await loadHirerEdit(hirerSession);
  }
});

function show(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = "block";
}

async function loadWorkerEdit(workerId) {
  var results = await window.supabaseGet("workers", "id=eq." + workerId);
  if (!results || results.length === 0) { show("notLoggedIn"); return; }

  var w = results[0];
  editWorkerData = workerFromSupabase(w);
  window._editSocialLinks = editWorkerData.socialLinks ? editWorkerData.socialLinks.slice() : [];
  show("workerEditWrap");

  var photoEl = document.getElementById("editWorkerPhoto");
  if (editWorkerData.photoURL) {
    photoEl.innerHTML = '<img src="' + editWorkerData.photoURL + '" style="width:100%;height:100%;object-fit:cover;">';
  } else {
    photoEl.textContent = editWorkerData.name.charAt(0).toUpperCase();
  }

  document.getElementById("editWorkerName").textContent  = editWorkerData.name;
  document.getElementById("editWorkerSkill").textContent = editWorkerData.subSkill
    ? editWorkerData.skill + " | " + editWorkerData.subSkill : editWorkerData.skill;
  document.getElementById("editWorkerPhone").textContent = "+91 " + editWorkerData.phone;
  document.getElementById("editAddress").value           = editWorkerData.address || "";
  document.getElementById("editBio").value               = editWorkerData.bio || "";
  document.getElementById("editHours").value             = editWorkerData.workingHours || "";
  document.getElementById("editAvailable").checked       = !!editWorkerData.available;
  document.getElementById("editWhatsapp").checked        = !!editWorkerData.hasWhatsApp;

  /* Check aadhaar status */
  try {
    var aadhaarDoc = await window.firestoreGetDoc(window.firestoreDoc(window.firebaseDb, "aadhaar_pending", workerId));
    if (aadhaarDoc.exists() && aadhaarDoc.data().status === "rejected") {
      document.getElementById("aadhaarReuploadGroup").style.display = "block";
    }
  } catch(err) { console.error(err); }

  renderEditSocialTags();

  var bioEl   = document.getElementById("editBio");
  var countEl = document.getElementById("editBioCount");
  countEl.textContent = bioEl.value.length + " / 200";
  bioEl.addEventListener("input", function() {
    countEl.textContent = bioEl.value.length + " / 200";
  });

  if (editWorkerData.photoURL) {
    document.getElementById("editPhotoPreview").src = editWorkerData.photoURL;
    document.getElementById("editPhotoPreview").style.display = "block";
    document.getElementById("editPhotoPlaceholder").style.display = "none";
  }
}

function handleEditAadhaar(input) {
  if (!input.files || !input.files[0]) return;
  var box = document.getElementById("editAadhaarBox");
  box.classList.add("uploaded");
  document.getElementById("editAadhaarLabel").textContent = input.files[0].name;
  var reader = new FileReader();
  reader.onload = function(e) { window._newAadhaarData = e.target.result; };
  reader.readAsDataURL(input.files[0]);
}

function handleEditPhoto(input) {
  if (!input.files || !input.files[0]) return;
  if (input.files[0].size > 2 * 1024 * 1024) { showToast("Photo must be under 2MB"); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement("canvas");
      var maxW = 400;
      var scale = img.width > maxW ? maxW / img.width : 1;
      canvas.width  = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      var compressed = canvas.toDataURL("image/webp", 0.7);
      document.getElementById("editPhotoPreview").src = compressed;
      document.getElementById("editPhotoPreview").style.display = "block";
      document.getElementById("editPhotoPlaceholder").style.display = "none";
      showToast("Photo ready (" + Math.round((compressed.length * 3) / 4 / 1024) + " KB)");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

async function saveWorkerProfile() {
  document.getElementById("editWorkerErr").textContent = "";
  var bio     = document.getElementById("editBio").value.trim();
  var address = document.getElementById("editAddress").value.trim();
  var hours   = document.getElementById("editHours").value.trim();
  var avail   = document.getElementById("editAvailable").checked;
  var wa      = document.getElementById("editWhatsapp").checked;
  var preview = document.getElementById("editPhotoPreview");

  var photoURL = editWorkerData.photoURL || "";

  /* Upload new photo if changed */
  if (preview && preview.style.display !== "none" && preview.src.startsWith("data:")) {
    var photoPath = "profiles/" + editWorkerData.id + "/photo.webp";
    var uploaded = await window.supabaseUploadPhoto(photoPath, preview.src, "image/webp");
    if (uploaded) photoURL = uploaded;
  }

  /* Upload new Aadhaar if provided */
  if (window._newAadhaarData) {
    var aadhaarPath = "aadhaar/" + editWorkerData.id + "/aadhaar.jpg";
    var aadhaarUploaded = await window.supabaseUploadPhoto(aadhaarPath, window._newAadhaarData, "image/jpeg");
    if (aadhaarUploaded) {
      await window.firestoreSetDoc(
        window.firestoreDoc(window.firebaseDb, "aadhaar_pending", editWorkerData.id),
        { workerId: editWorkerData.id, aadhaarUrl: aadhaarUploaded, status: "pending", createdAt: Date.now() }
      );
      window._newAadhaarData = null;
    }
  }

  await window.supabaseUpdate("workers", editWorkerData.id, {
    bio: bio,
    address: address,
    working_hours: hours,
    available: avail,
    has_whatsapp: wa,
    photo_url: photoURL,
    social_links: window._editSocialLinks || []
  });

  showToast("Profile updated!");
  setTimeout(function() {
    window.location.href = "workerprofile.html?id=" + editWorkerData.id;
  }, 1200);
}

async function loadHirerEdit(uid) {
  try {
    var hirerDoc = await window.firestoreGetDoc(window.firestoreDoc(window.firebaseDb, "hirers", uid));
    if (!hirerDoc.exists()) { show("notLoggedIn"); return; }
    var hirer = hirerDoc.data();
    editHirerUid = uid;
    show("hirerEditWrap");

    var avatarEl = document.getElementById("editHirerAvatar");
    avatarEl.textContent = hirer.name.charAt(0).toUpperCase();
    document.getElementById("editHirerName").textContent  = hirer.name;
    document.getElementById("editHirerFullName").value    = hirer.name;
  } catch(err) {
    console.error("loadHirerEdit error:", err);
    show("notLoggedIn");
  }
}

async function saveHirerProfile() {
  document.getElementById("editHirerErrName").textContent = "";
  document.getElementById("editHirerErrPw").textContent   = "";
  document.getElementById("editHirerErrPw2").textContent  = "";
  document.getElementById("editHirerErr").textContent     = "";

  var name = document.getElementById("editHirerFullName").value.trim();
  var pw   = document.getElementById("editHirerPw").value;
  var pw2  = document.getElementById("editHirerPw2").value;
  var ok   = true;

  if (!name || name.length < 2) {
    document.getElementById("editHirerErrName").textContent = "Enter your full name";
    ok = false;
  }
  if (pw && pw.length < 6) {
    document.getElementById("editHirerErrPw").textContent = "Password must be at least 6 characters";
    ok = false;
  }
  if (pw && pw !== pw2) {
    document.getElementById("editHirerErrPw2").textContent = "Passwords do not match";
    ok = false;
  }
  if (!ok) return;

  await window.firestoreUpdateDoc(window.firestoreDoc(window.firebaseDb, "hirers", editHirerUid), { name: name });

  if (pw) {
    try {
      await window.firebaseAuth.currentUser.updatePassword(pw);
    } catch(err) {
      document.getElementById("editHirerErr").textContent = "Could not update password. Please login again and retry.";
      return;
    }
  }

  showToast("Profile updated!");
  setTimeout(function() { window.location.href = "hirerauth.html"; }, 1200);
}

function toggleEditPw(inputId, iconId) {
  var input = document.getElementById(inputId);
  var icon  = document.getElementById(iconId);
  if (input.type === "password") {
    input.type = "text"; icon.className = "fa-regular fa-eye-slash";
  } else {
    input.type = "password"; icon.className = "fa-regular fa-eye";
  }
}

window._editSocialLinks = [];

function addEditSocialLink() {
  var platform = document.getElementById("editSocialPlatform").value;
  var url = document.getElementById("editSocialLinkInput").value.trim();
  if (!url) { showToast("Enter a link first"); return; }
  if (!url.startsWith("http")) url = "https://" + url;
  window._editSocialLinks.push({ platform: platform, url: url });
  document.getElementById("editSocialLinkInput").value = "";
  renderEditSocialTags();
}

function removeEditSocialLink(idx) {
  window._editSocialLinks.splice(idx, 1);
  renderEditSocialTags();
}

function renderEditSocialTags() {
  var container = document.getElementById("editSocialTagsContainer");
  if (!container) return;
  var icons = {
    Instagram: "fa-brands fa-instagram",
    Facebook:  "fa-brands fa-facebook",
    YouTube:   "fa-brands fa-youtube",
    WhatsApp:  "fa-brands fa-whatsapp",
    Website:   "fa-solid fa-globe",
    Other:     "fa-solid fa-link"
  };
  container.innerHTML = window._editSocialLinks.map(function(link, i) {
    return '<span class="social-tag"><i class="' + (icons[link.platform] || "fa-solid fa-link") + '"></i> '
      + link.platform
      + '<button type="button" class="social-tag-remove" onclick="removeEditSocialLink(' + i + ')">\u2715</button></span>';
  }).join("");
}
/* COBLOCAL -- EDITPROFILE.JS */

var editUserType  = null;
var editWorkerData = null;
var editHirerUid = null;
var isPhotoChanged = false;  // Track if photo was changed

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

// Helper function to convert Supabase data to worker object
function workerFromSupabase(data) {
  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    skill: data.skill,
    subSkill: data.sub_skill,
    address: data.address || "",
    bio: data.bio || "",
    workingHours: data.working_hours || "",
    available: data.available || false,
    hasWhatsApp: data.has_whatsapp || false,
    photoURL: data.photo_url || "",
    socialLinks: data.social_links || []
  };
}

function showToast(message, isError = false) {
  var toast = document.getElementById("toast") || createToast();
  toast.textContent = message;
  toast.className = "show" + (isError ? " error" : "");
  setTimeout(function() {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}

function createToast() {
  var toast = document.createElement("div");
  toast.id = "toast";
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.backgroundColor = "#333";
  toast.style.color = "#fff";
  toast.style.padding = "12px 24px";
  toast.style.borderRadius = "8px";
  toast.style.zIndex = "9999";
  toast.style.display = "none";
  document.body.appendChild(toast);
  return toast;
}

async function loadWorkerEdit(workerId) {
  try {
    var results = await window.supabaseGet("workers", "id=eq." + workerId);
    if (!results || results.length === 0) { 
      show("notLoggedIn"); 
      return; 
    }

    var w = results[0];
    editWorkerData = workerFromSupabase(w);
    window._editSocialLinks = editWorkerData.socialLinks ? editWorkerData.socialLinks.slice() : [];
    show("workerEditWrap");

    // Display photo
    var photoEl = document.getElementById("editWorkerPhoto");
    if (editWorkerData.photoURL) {
      photoEl.innerHTML = '<img src="' + editWorkerData.photoURL + '?t=' + Date.now() + '" style="width:100%;height:100%;object-fit:cover;">';
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
    } catch(err) { 
      console.error("Aadhaar check error:", err); 
    }

    renderEditSocialTags();

    var bioEl   = document.getElementById("editBio");
    var countEl = document.getElementById("editBioCount");
    countEl.textContent = bioEl.value.length + " / 200";
    bioEl.addEventListener("input", function() {
      countEl.textContent = bioEl.value.length + " / 200";
    });

    // Set initial preview
    if (editWorkerData.photoURL) {
      document.getElementById("editPhotoPreview").src = editWorkerData.photoURL + "?t=" + Date.now();
      document.getElementById("editPhotoPreview").style.display = "block";
      document.getElementById("editPhotoPlaceholder").style.display = "none";
    } else {
      document.getElementById("editPhotoPreview").style.display = "none";
      document.getElementById("editPhotoPlaceholder").style.display = "flex";
    }
    
    isPhotoChanged = false;
    
  } catch(error) {
    console.error("loadWorkerEdit error:", error);
    showToast("Error loading profile", true);
  }
}

function handleEditAadhaar(input) {
  if (!input.files || !input.files[0]) return;
  var box = document.getElementById("editAadhaarBox");
  box.classList.add("uploaded");
  document.getElementById("editAadhaarLabel").textContent = input.files[0].name;
  var reader = new FileReader();
  reader.onload = function(e) { 
    window._newAadhaarData = e.target.result; 
  };
  reader.readAsDataURL(input.files[0]);
}

function handleEditPhoto(input) {
  if (!input.files || !input.files[0]) {
    return;
  }
  
  var file = input.files[0];
  if (file.size > 2 * 1024 * 1024) { 
    showToast("Photo must be under 2MB", true); 
    return; 
  }
  
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
      
      // Set the preview
      document.getElementById("editPhotoPreview").src = compressed;
      document.getElementById("editPhotoPreview").style.display = "block";
      document.getElementById("editPhotoPlaceholder").style.display = "none";
      
      // Mark that photo has been changed
      isPhotoChanged = true;
      
      // Store the compressed data for upload
      window._newPhotoData = compressed;
      
      showToast("Photo ready (" + Math.round((compressed.length * 3) / 4 / 1024) + " KB)");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function saveWorkerProfile() {
  const errElement = document.getElementById("editWorkerErr");
  if (errElement) errElement.textContent = "";
  
  showToast("Saving profile...");
  
  try {
    var bio     = document.getElementById("editBio").value.trim();
    var address = document.getElementById("editAddress").value.trim();
    var hours   = document.getElementById("editHours").value.trim();
    var avail   = document.getElementById("editAvailable").checked;
    var wa      = document.getElementById("editWhatsapp").checked;
    
    var photoURL = editWorkerData.photoURL || "";

    /* Upload new photo if changed */
    if (isPhotoChanged && window._newPhotoData) {
      showToast("Uploading photo...");
      var photoPath = "profiles/" + editWorkerData.id + "/photo.webp";
      var uploaded = await window.supabaseUploadPhoto(photoPath, window._newPhotoData, "image/webp");
      
      if (uploaded) {
        photoURL = uploaded;
        showToast("Photo uploaded successfully!");
        // Clear the stored photo data after successful upload
        delete window._newPhotoData;
        isPhotoChanged = false;
      } else {
        throw new Error("Failed to upload photo");
      }
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

    /* Update worker profile in Supabase */
    const updateSuccess = await window.supabaseUpdate("workers", editWorkerData.id, {
      bio: bio,
      address: address,
      working_hours: hours,
      available: avail,
      has_whatsapp: wa,
      photo_url: photoURL,
      social_links: window._editSocialLinks || []
    });

    if (!updateSuccess) {
      throw new Error("Failed to update profile data");
    }

    showToast("Profile updated successfully!");
    setTimeout(function() {
      window.location.href = "workerprofile.html?id=" + editWorkerData.id;
    }, 1500);
    
  } catch(error) {
    console.error("Save error:", error);
    if (errElement) errElement.textContent = error.message || "Failed to save profile. Please try again.";
    showToast(error.message || "Failed to save profile", true);
  }
}

async function loadHirerEdit(uid) {
  try {
    var hirerDoc = await window.firestoreGetDoc(window.firestoreDoc(window.firebaseDb, "hirers", uid));
    if (!hirerDoc.exists()) { 
      show("notLoggedIn"); 
      return; 
    }
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

  try {
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
  } catch(error) {
    console.error("Save error:", error);
    showToast("Failed to save profile", true);
  }
}

function toggleEditPw(inputId, iconId) {
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

window._editSocialLinks = [];

function addEditSocialLink() {
  var platform = document.getElementById("editSocialPlatform").value;
  var url = document.getElementById("editSocialLinkInput").value.trim();
  if (!url) { 
    showToast("Enter a link first", true); 
    return; 
  }
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

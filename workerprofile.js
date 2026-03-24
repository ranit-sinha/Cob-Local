/* COBLOCAL -- PROFILE.JS */

var currentWorkerId = null;

function getWorkerFromURL() {
  var params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function findWorker(id) {
  var results = await window.supabaseGet("workers", "id=eq." + id);
  if (results && results.length > 0) return workerFromSupabase(results[0]);
  return null;
}

async function getFeedbacksForWorker(workerId) {
  try {
    var snap = await window.firestoreGetDocs(
      window.firestoreQuery(
        window.firestoreCollection(window.firebaseDb, "feedbacks"),
        window.firestoreWhere("workerId", "==", workerId),
        window.firestoreOrderBy("date", "desc")
      )
    );
    var feedbacks = [];
    snap.forEach(function(doc) { feedbacks.push(doc.data()); });
    return feedbacks;
  } catch(err) {
    console.error("getFeedbacks error:", err);
    return [];
  }
}

function buildStars(rating) {
  var stars = "";
  var full  = Math.floor(rating);
  var half  = rating - full >= 0.5 ? 1 : 0;
  var empty = 5 - full - half;
  for (var i = 0; i < full;  i++) stars += '<i class="fa-solid fa-star"></i>';
  for (var i = 0; i < half;  i++) stars += '<i class="fa-solid fa-star-half-stroke"></i>';
  for (var i = 0; i < empty; i++) stars += '<i class="fa-regular fa-star"></i>';
  return stars;
}

function formatDate(timestamp) {
  var d = new Date(timestamp);
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
}

async function renderProfile(worker) {
  currentWorkerId = worker.id;
  document.getElementById("profilePageTitle").textContent = worker.name;

  var photoWrap = document.getElementById("profilePhotoWrap");
  if (worker.photoURL) {
    photoWrap.innerHTML = '<img src="' + worker.photoURL + '" alt="' + worker.name + '" style="cursor:zoom-in;" onclick="openFullImg(\'' + worker.photoURL + '\')">';
  } else {
    photoWrap.innerHTML = '<div class="profile-photo-placeholder">' + worker.name.charAt(0) + '</div>';
  }

  document.getElementById("profileName").textContent = worker.name;
  var skillDisplay = worker.subSkill ? worker.skill + " | " + worker.subSkill : worker.skill;
  document.getElementById("profileSkill").textContent = skillDisplay;

  if (worker.address) {
    document.getElementById("profileAddressRow").style.display = "flex";
    document.getElementById("profileAddress").textContent = worker.address;
  }

  var workerSession = localStorage.getItem("ctj_worker_session");
  var isOwnProfile = workerSession && workerSession === worker.id;
  if (worker.aadhaarVerified) {
    document.getElementById("profileVerified").style.display = "flex";
    document.getElementById("profileAadharLine").style.display = "flex";
  } else if (isOwnProfile) {
    /* Check aadhaar pending status from Firestore */
    try {
      var aadhaarDoc = await window.firestoreGetDoc(window.firestoreDoc(window.firebaseDb, "aadhaar_pending", worker.id));
      if (aadhaarDoc.exists()) {
        var aadhaarData = aadhaarDoc.data();
        if (aadhaarData.status === "pending") {
          document.getElementById("profileAadharPending").style.display = "flex";
        } else if (aadhaarData.status === "rejected") {
          document.getElementById("profileAadharRejected").style.display = "flex";
        }
      }
    } catch(err) { console.error(err); }
  }

  var ageEl = document.getElementById("profileAge");
  if (worker.providerType === "business") {
    ageEl.style.display = "none";
  } else {
    ageEl.textContent = "Age: " + worker.age;
  }

  var availEl = document.getElementById("profileAvail");
  availEl.textContent = worker.available ? "Available" : "Currently Busy";
  availEl.className = "profile-avail " + (worker.available ? "available" : "unavailable");

  var phoneTypeEl = document.getElementById("profilePhoneType");
  if (!worker.hasSmartphone) {
    phoneTypeEl.textContent = "Basic Phone";
    document.getElementById("profileNote").style.display = "flex";
  } else {
    phoneTypeEl.style.display = "none";
  }

  if (worker.workingHours) {
    document.getElementById("workingHoursSection").style.display = "block";
    document.getElementById("profileWorkingHours").textContent = worker.workingHours;
  }

  if (worker.bio) {
    document.getElementById("bioSection").style.display = "block";
    document.getElementById("profileBio").textContent = worker.bio;
  }

  if (worker.providerType === "business") {
    var bizSection = document.getElementById("profileBizInfoSection");
    var bizInfoEl = document.getElementById("profileBizInfo");
    if (bizSection && bizInfoEl) {
      var bizText = worker.businessType || "";
      if (worker.businessSubType) bizText += " - " + worker.businessSubType;
      if (worker.contactPerson) bizText += "\nContact: " + worker.contactPerson;
      bizInfoEl.textContent = bizText;
      bizSection.style.display = "block";
    }
  }

  var socialSection = document.getElementById("profileSocialLinks");
  if (socialSection && worker.socialLinks && worker.socialLinks.length > 0) {
    var socialIcons = { Instagram: "fa-brands fa-instagram", Facebook: "fa-brands fa-facebook", YouTube: "fa-brands fa-youtube", WhatsApp: "fa-brands fa-whatsapp", Website: "fa-solid fa-globe", Other: "fa-solid fa-link" };
    socialSection.innerHTML = worker.socialLinks.map(function(link) {
      return '<a href="' + link.url + '" target="_blank" class="social-link-item"><i class="' + (socialIcons[link.platform] || "fa-solid fa-link") + '"></i><span>' + link.platform + '</span><i class="fa-solid fa-arrow-up-right-from-square" style="font-size:11px;color:var(--text3);margin-left:auto;"></i></a>';
    }).join("");
    document.getElementById("profileSocialSection").style.display = "block";
  }

  var hirerSession  = localStorage.getItem("ctj_hirer_session");
  var isLoggedIn    = hirerSession || workerSession;
  if (isLoggedIn) {
    document.getElementById("callBtn").href = "tel:" + worker.phone;
    if (worker.hasWhatsApp) {
      var waBtn = document.getElementById("whatsappBtn");
      waBtn.style.display = "flex";
      waBtn.href = "https://wa.me/91" + worker.phone;
    }
  } else {
    var contactRow = document.getElementById("profileContactRow");
    if (contactRow) {
      contactRow.innerHTML = '<a href="login.html" class="contact-btn call-btn" style="text-align:center"><i class="fa-solid fa-lock"></i><span data-key="loginToContact">Login to Contact</span></a>';
    }
  }

  var feedbackCTA = document.getElementById("feedbackCTA");
  var feedbackBtn = document.getElementById("feedbackCTABtn");
  if (feedbackCTA && feedbackBtn) {
    if (isOwnProfile) {
      feedbackCTA.style.display = "none";
    } else if (!hirerSession) {
      feedbackCTA.innerHTML = '<p style="color:rgba(255,255,255,0.85);font-size:13px;margin-bottom:12px;">Want to rate this worker?</p><a href="hirerauth.html?next=givefeedback&id=' + worker.id + '" class="feedback-cta-btn"><i class="fa-solid fa-lock"></i> Login to give feedback</a>';
      feedbackCTA.style.display = "block";
    } else {
      feedbackBtn.href = "givefeedback.html?id=" + worker.id;
      feedbackCTA.style.display = "block";
    }
  }

  updateFavButton(worker.id);
  await renderRatings(worker);
  renderFeedbacksFromFirestore(worker);

  document.getElementById("profileLoading").style.display = "none";
  document.getElementById("profilePage").style.display    = "block";
  var shareBtn = document.getElementById("shareBtn");
  if (shareBtn) shareBtn.style.display = "flex";

  var profileLevelEl = document.getElementById("profileLevel");
  var lvObj = getLevelFromRating(worker.averageRating, worker.totalFeedbacks);
  if (lvObj) {
    profileLevelEl.textContent = lvObj.name;
    profileLevelEl.style.background = lvObj.color;
    profileLevelEl.style.color = "white";
    profileLevelEl.style.display = "inline-block";
  } else {
    profileLevelEl.style.display = "none";
  }
}

async function renderRatings(worker) {
  var allFeedbacks = await getFeedbacksForWorker(worker.id);
  var total = allFeedbacks.length;
  var sum   = allFeedbacks.reduce(function(acc, f) { return acc + (f.rating || 0); }, 0);
  var avg   = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

  if (total > 0) {
    /* Update Supabase with latest rating */
    await window.supabaseUpdate("workers", worker.id, { average_rating: avg, total_feedbacks: total });
    worker.averageRating  = avg;
    worker.totalFeedbacks = total;
  }

  if (total >= 1 && avg > 0) {
    document.getElementById("ratingSummary").style.display = "block";
    document.getElementById("ratingNumber").textContent = avg.toFixed(1);
    document.getElementById("ratingStars").innerHTML = buildStars(avg);
    document.getElementById("ratingCount").textContent = "Based on " + total + " review" + (total > 1 ? "s" : "");
  } else {
    document.getElementById("profileNoRating").style.display = "flex";
  }
}

async function renderFeedbacksFromFirestore(worker) {
  var feedbacks = await getFeedbacksForWorker(worker.id);
  var list = document.getElementById("feedbacksList");
  var countLabel = document.getElementById("feedbackCount");

  if (feedbacks.length === 0) {
    list.innerHTML = '<div class="no-feedbacks">No reviews yet</div>';
    countLabel.textContent = "";
    return;
  }

  countLabel.textContent = feedbacks.length + " review" + (feedbacks.length > 1 ? "s" : "");
  var html = "";
  feedbacks.forEach(function(f) {
    html += '<div class="feedback-item"><div class="feedback-top"><span class="feedback-hirer">' + f.hirerName + '</span>';
    if (f.rating > 0) html += '<span class="feedback-stars">' + buildStars(f.rating) + '</span>';
    html += '</div><div class="feedback-text">' + (f.comment || "") + '</div><div class="feedback-date">' + formatDate(f.date) + '</div></div>';
  });
  list.innerHTML = html;
}

function updateFavButton(workerId) {
  var favs = getFavourites();
  var btn  = document.getElementById("profileFavBtn");
  var icon = document.getElementById("profileFavIcon");
  if (favs.includes(workerId)) {
    btn.classList.add("saved");
    icon.className = "fa-solid fa-heart";
  } else {
    btn.classList.remove("saved");
    icon.className = "fa-regular fa-heart";
  }
}

function toggleProfileFav() {
  if (!currentWorkerId) return;
  var favs = getFavourites();
  if (favs.includes(currentWorkerId)) {
    favs = favs.filter(function(id) { return id !== currentWorkerId; });
    showToast("Removed from favourites");
  } else {
    favs.push(currentWorkerId);
    showToast("Added to favourites");
  }
  localStorage.setItem("ctj_favourites", JSON.stringify(favs));
  updateFavButton(currentWorkerId);
}

function shareWorkerProfile() {
  if (!currentWorkerId) return;
  var profileURL = window.location.origin + window.location.pathname + "?id=" + currentWorkerId;
  if (navigator.share) {
    navigator.share({ title: "Cob Local", url: profileURL }).catch(function() {});
  } else {
    window.open("https://wa.me/?text=" + encodeURIComponent(profileURL), "_blank");
  }
}

document.addEventListener("DOMContentLoaded", async function() {
  var workerId = getWorkerFromURL();
  if (!workerId) {
    document.getElementById("profileLoading").style.display = "none";
    document.getElementById("profileNotFound").style.display = "block";
    return;
  }
  var worker = await findWorker(workerId);
  if (!worker) {
    document.getElementById("profileLoading").style.display = "none";
    document.getElementById("profileNotFound").style.display = "block";
    return;
  }
  renderProfile(worker);
});
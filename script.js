/*   COBLOCAL -- SCRIPT.JS   */

var DUMMY_WORKERS = [];
var DUMMY_FEEDBACKS = [];

/* -- GET ALL WORKERS -- now reads from Supabase */
async function getAllWorkersAsync() {
  try {
    var workers = await window.supabaseGet("workers", "order=created_at.desc");
    if (!workers || workers.error) return [];
    return workers.map(function(w) { return workerFromSupabase(w); });
  } catch(err) {
    console.error("getAllWorkersAsync error:", err);
    return [];
  }
}

/* -- Convert Supabase worker to app format -- */
function workerFromSupabase(w) {
  return {
    id: w.id,
    name: w.name,
    providerType: w.provider_type,
    businessType: w.business_type,
    businessSubType: w.business_sub_type,
    contactPerson: w.contact_person,
    age: w.age,
    gender: w.gender,
    bio: w.bio,
    address: w.address,
    skill: w.skill,
    subSkill: w.sub_skill,
    workingHours: w.working_hours,
    available: w.available,
    phone: w.phone,
    hasSmartphone: w.has_smartphone,
    hasWhatsApp: w.has_whatsapp,
    aadhaarVerified: w.aadhaar_verified,
    photoURL: w.photo_url,
    averageRating: parseFloat(w.average_rating) || 0,
    totalFeedbacks: w.total_feedbacks || 0,
    socialLinks: w.social_links || [],
    createdAt: w.created_at
  };
}

/* -- Keep old getAllWorkers for compatibility but make it return cached -- */
var _cachedWorkers = [];
function getAllWorkers() { return _cachedWorkers; }

/* -- GET LIVE RATING FOR WORKER -- reads from Firestore -- */
function getLiveRating(workerId) {
  var worker = _cachedWorkers.find(function(w) { return w.id === workerId; });
  if (worker && worker.averageRating > 0 && worker.totalFeedbacks > 0) {
    return { avg: worker.averageRating, total: worker.totalFeedbacks };
  }
  return { avg: 0, total: 0 };
}

/* -- FAVOURITES -- */
function getFavourites() {
  return JSON.parse(localStorage.getItem("ctj_favourites") || "[]");
}

function toggleFavourite(workerId, event) {
  if (event) event.stopPropagation();
  var favs = getFavourites();
  var btn = document.querySelector('[data-fav="' + workerId + '"]');
  if (favs.includes(workerId)) {
    favs = favs.filter(function(id) { return id !== workerId; });
    if (btn) btn.innerHTML = '<i class="fa-regular fa-heart fav-heart-icon"></i>';
    showToast("Removed from favourites");
  } else {
    favs.push(workerId);
    if (btn) btn.innerHTML = '<i class="fa-solid fa-heart fav-heart-icon"></i>';
    showToast("Added to favourites");
  }
  localStorage.setItem("ctj_favourites", JSON.stringify(favs));
}

/* -- LEVEL FROM RATING -- */
function getLevelFromRating(averageRating, totalFeedbacks) {
  if (!averageRating || totalFeedbacks < 1) return null;
  if (averageRating >= 4.5) return { name: "Master",       color: "#8100e3" };
  if (averageRating >= 4.0) return { name: "Elite",        color: "#f2ba00" };
  if (averageRating >= 3.5) return { name: "Veteran",      color: "#0e8700" };
  if (averageRating >= 3.0) return { name: "Professional", color: "#00a2ff" };
  if (averageRating >= 2.5) return { name: "Specialist",   color: "#a30000" };
  return null;
}

/* -- BUILD WORKER CARD -- */
function buildWorkerCard(worker) {
  var favs = getFavourites();
  var isFav = favs.includes(worker.id);
  var liveRating = getLiveRating(worker.id);
  var ratingHTML = (liveRating.total >= 1 && liveRating.avg > 0)
    ? " " + liveRating.avg.toFixed(1)
    : '<span style="font-size:10px;color:#8a9ab0">New</span>';
  worker.averageRating  = liveRating.avg;
  worker.totalFeedbacks = liveRating.total;
  var availClass = worker.available ? "available" : "unavailable";
  var availText = worker.available ? "Available" : "Unavailable";
  var verifiedHTML = worker.aadhaarVerified ? '<span class="verified-badge">Verified</span>' : '';
  var photoContent = worker.photoURL
    ? '<img src="' + worker.photoURL + '" alt="' + worker.name + '" loading="lazy">'
    : '<div class="photo-placeholder">' + worker.name.charAt(0) + '</div>';
  var favIcon = isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
  var skillDisplay = (worker.skill === "Others" && worker.subSkill) ? worker.subSkill : (worker.subSkill ? worker.skill + " | " + worker.subSkill : worker.skill);

  return '<div class="worker-card" onclick="goToProfile(\'' + worker.id + '\')">'
    + '<div class="card-photo-wrap">'
    + photoContent
    + '<div class="card-badge-row">'
    + verifiedHTML
    + (worker.providerType === "business" ? '' : (function(){ var lv = getLevelFromRating(worker.averageRating, worker.totalFeedbacks); return lv ? '<span class="level-badge" style="background:' + lv.color + ';color:white">' + lv.name + '</span>' : ''; })())
    + '</div>'
    + '<button class="fav-btn" data-fav="' + worker.id + '" onclick="toggleFavourite(\'' + worker.id + '\', event)"><i class="' + favIcon + ' fav-heart-icon"></i></button>'
    + '</div>'
    + '<div class="card-info">'
    + '<div class="card-name">' + worker.name + '</div>'
    + '<div class="card-skill">' + skillDisplay + '</div>'
    + (worker.providerType === "business" ? '<div class="card-business-type"><i class="fa-solid fa-store"></i> ' + (worker.businessType || "Business") + '</div>' : '')
    + '<div class="card-meta">'
    + '<div class="card-rating">' + ratingHTML + '</div>'
    + '<span class="card-avail ' + availClass + '">' + availText + '</span>'
    + '</div>'
    + '</div>'
    + '</div>';
}

function goToProfile(workerId) { navigateTo("workerprofile.html?id=" + workerId); }

/* -- LOAD TOP RATED -- */
async function loadTopRated() {
  var grid = document.getElementById("topRatedGrid");
  if (!grid) return;
  var workers = await getAllWorkersAsync();
  _cachedWorkers = workers;
  var rated = workers
    .filter(function(w) { return w.averageRating > 0 && w.totalFeedbacks >= 1; })
    .sort(function(a, b) { return b.averageRating - a.averageRating; })
    .slice(0, 4);
  if (rated.length < 4) {
    var extra = workers.filter(function(w) { return w.aadhaarVerified && rated.indexOf(w) === -1; }).slice(0, 4 - rated.length);
    rated = rated.concat(extra);
  }
  grid.innerHTML = rated.length === 0
    ? '<div class="empty-state"><p>No providers found</p></div>'
    : rated.map(buildWorkerCard).join("");
}

/* -- LOAD NO SMARTPHONE -- */
async function loadNoSmartphone() {
  var grid = document.getElementById("nosmpGrid");
  if (!grid) return;
  if (_cachedWorkers.length === 0) {
    _cachedWorkers = await getAllWorkersAsync();
  }
  var nosmp = _cachedWorkers
    .filter(function(w) { return !w.hasSmartphone; })
    .sort(function(a, b) {
      if (b.aadhaarVerified !== a.aadhaarVerified) return b.aadhaarVerified ? 1 : -1;
      return b.createdAt - a.createdAt;
    })
    .slice(0, 4);
  grid.innerHTML = nosmp.length === 0
    ? '<div class="empty-state"><p>No providers found</p></div>'
    : nosmp.map(buildWorkerCard).join("");
}

/* -- SEARCH -- */
var searchTimeout = null;

function handleSearch(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(function() {
    performSearch(query.trim().toLowerCase());
  }, 300);
}

function performSearch(query) {
  var resultsSection = document.getElementById("searchResults");
  var mainContent = document.getElementById("mainContent");
  var topRated = document.querySelector(".top-rated-section");
  var nosmp = document.querySelector(".nosmp-section");
  var banner = document.querySelector(".register-banner");
  var searchGrid = document.getElementById("searchGrid");
  if (!query) { clearSearch(); return; }
  var results = _cachedWorkers.filter(function(w) {
    return w.name.toLowerCase().indexOf(query) !== -1
      || w.skill.toLowerCase().indexOf(query) !== -1
      || (w.subSkill && w.subSkill.toLowerCase().indexOf(query) !== -1);
  });
  if (mainContent) mainContent.style.display = "none";
  if (topRated) topRated.style.display = "none";
  if (nosmp) nosmp.style.display = "none";
  if (banner) banner.style.display = "none";
  resultsSection.style.display = "block";
  searchGrid.innerHTML = results.length === 0
    ? '<div class="empty-state"><p>No providers found</p></div>'
    : results.map(buildWorkerCard).join("");
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  document.getElementById("searchResults").style.display = "none";
  var mainContent = document.getElementById("mainContent");
  var topRated = document.querySelector(".top-rated-section");
  var nosmp = document.querySelector(".nosmp-section");
  var banner = document.querySelector(".register-banner");
  if (mainContent) mainContent.style.display = "block";
  if (topRated) topRated.style.display = "block";
  if (nosmp) nosmp.style.display = "block";
  if (banner) banner.style.display = "block";
}

/* -- BROWSE CATEGORY -- */
function browseCat(skill) { navigateTo("browse.html?skill=" + skill); }

/* -- SUB-CATEGORY BOTTOM SHEET -- */
var SUBCAT_DATA = {
  tutor: { title: "Tutor", icon: "fa-book", skill: "Tutor", subs: ["Study", "Drawing", "Singing", "Dance", "Instrument", "Recitation"] },
  driver: { title: "Driver", icon: "fa-car-side", skill: "Driver", subs: ["Car", "Bus", "Toto"] },
  institutes: { title: "Institutes", icon: "fa-building-columns", skill: "Institutes", subs: ["Private Teaching / Coaching", "Singing Classes", "Dance Classes", "Modeling / Acting", "Art & Drawing", "Music Instrument", "Sports Academy", "Others"] },
  shops: { title: "Shops / Agencies", icon: "fa-store", skill: "Shops", subs: ["Medical Shop", "Mobile Repair", "Bike / Vehicle Repair", "Catering", "Decoration", "Event Management", "Gym", "Others"] }
};

function openSubCat(key) {
  var data = SUBCAT_DATA[key];
  if (!data) { browseCat(key); return; }
  document.getElementById("subcatTitle").textContent = data.title;
  var grid = document.getElementById("subcatGrid");
  grid.innerHTML = data.subs.map(function(sub) {
    return '<button class="subcat-btn" onclick="browseSubCat(\'' + data.skill + '\',\'' + sub + '\')">' + sub + '</button>';
  }).join("");
  document.getElementById("subcatAllBtn").onclick = function() { closeSubCat(); browseCat(key); };
  document.getElementById("subcatOverlay").classList.add("active");
  document.getElementById("subcatSheet").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeSubCat() {
  document.getElementById("subcatOverlay").classList.remove("active");
  document.getElementById("subcatSheet").classList.remove("active");
  document.body.style.overflow = "";
}

function browseSubCat(skill, sub) {
  closeSubCat();
  navigateTo("browse.html?skill=" + encodeURIComponent(skill) + "&sub=" + encodeURIComponent(sub));
}

/* -- MENU -- */
function openMenu() {
  document.getElementById("slideMenu").classList.add("active");
  document.getElementById("menuOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeMenu() {
  document.getElementById("slideMenu").classList.remove("active");
  document.getElementById("menuOverlay").classList.remove("active");
  document.body.style.overflow = "";
}

/* -- TOAST -- */
var toastTimeout = null;
function showToast(msg) {
  var existing = document.querySelector(".toast");
  if (existing) existing.remove();
  var toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(function() { toast.classList.add("show"); });
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(function() {
    toast.classList.remove("show");
    setTimeout(function() { toast.remove(); }, 300);
  }, 2500);
}

/* -- SHARE APP -- */
function shareApp() {
  var appURL = "https://ranit-sinha.github.io/downloadcoblocal/";
  var text = "Find trusted local providers in Coochbehar!\nTutors, drivers, Businesses and more - all verified locals.\nOpen Cob Local: " + appURL;
  if (navigator.share) {
    navigator.share({ title: "Cob Local", text: text, url: appURL }).catch(function() {});
  } else {
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  }
}

/* -- FULLSCREEN IMAGE VIEWER -- */
function openFullImg(src) {
  var ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";
  ov.innerHTML = '<img src="' + src + '" style="max-width:100%;max-height:90%;object-fit:contain;border-radius:10px;">'
    + '<button style="position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.2);color:white;font-size:20px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>';
  ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
}

function navigateTo(url) { window.location.href = url; }

/* -- INIT -- */
document.addEventListener("DOMContentLoaded", async function() {
  /* Load workers into cache first, then render sections */
  _cachedWorkers = await getAllWorkersAsync();
  loadTopRated();
  loadNoSmartphone();
});
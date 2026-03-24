/* COBLOCAL -- BROWSE.JS */

var currentSkill    = "all";
var currentSubSkill = "all";
var currentPhone    = "all";
var currentSort     = "default";
var currentSearch   = "";
var _browseWorkers  = [];

var SUB_SKILLS = {
  "Tutor":      ["All", "Study", "Drawing", "Singing", "Dance", "Instrument", "Recitation"],
  "Driver":     ["All", "Car", "Bus", "Toto"],
  "Institutes": ["All", "Private Teaching / Coaching", "Singing Classes", "Dance Classes", "Modeling / Acting", "Art & Drawing", "Music Instrument", "Sports Academy", "Others"],
  "Shops":      ["All", "Medical Shop", "Mobile Repair", "Bike / Vehicle Repair", "Catering", "Decoration", "Event Management", "Gym", "Others"]
};

function readURLParams() {
  var params = new URLSearchParams(window.location.search);
  var skill  = params.get("skill");
  var filter = params.get("filter");

  if (skill && skill !== "all") {
    var skillMap = {
      "tutor": "Tutor", "driver": "Driver", "institutes": "Institutes",
      "shops": "Shops", "electrician": "Electrician", "plumber": "Plumber",
      "pujari": "Pujari", "others": "Others"
    };
    var mapped = skillMap[skill.toLowerCase()] || skill;
    currentSkill = mapped;
    document.querySelectorAll(".skill-tab").forEach(function(btn) {
      btn.classList.remove("active");
      if (btn.getAttribute("data-skill") === mapped) {
        btn.classList.add("active");
        btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    });
    if (SUB_SKILLS[mapped]) {
      var subs = SUB_SKILLS[mapped];
      var subTabsEl1 = document.getElementById("subTabs");
      var subParam = params.get("sub") || "";
      subTabsEl1.innerHTML = subs.map(function(s) {
        var isActive = subParam ? s === subParam : s === "All";
        return '<button class="sub-tab' + (isActive ? " active" : "") + '" data-sub="' + s + '">' + s + '</button>';
      }).join("");
      if (subParam) currentSubSkill = subParam;
      document.getElementById("subTabsWrap").style.display = "block";
      setTimeout(function() {
        var activeBtn = subTabsEl1.querySelector(".sub-tab.active");
        if (activeBtn) activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }, 50);
      subTabsEl1.onclick = function(e) {
        var btn = e.target.tagName === "BUTTON" ? e.target : null;
        if (!btn) return;
        var sub = btn.getAttribute("data-sub");
        if (!sub) return;
        if (sub === "All") {
          window.location.href = "browse.html?skill=" + encodeURIComponent(currentSkill);
        } else {
          window.location.href = "browse.html?skill=" + encodeURIComponent(currentSkill) + "&sub=" + encodeURIComponent(sub);
        }
      };
    }
  }

  var sub = params.get("sub");
  if (sub) currentSubSkill = sub;

  if (filter === "nosmp") {
    currentPhone = "basic";
    document.getElementById("filterAll").classList.remove("active");
    document.getElementById("filterNosmp").classList.add("active");
  }
}

function getFilteredWorkers() {
  var workers = _browseWorkers.slice();
  if (currentSkill !== "all") {
    workers = workers.filter(function(w) { return w.skill === currentSkill; });
  }
  if (currentSubSkill !== "all") {
    workers = workers.filter(function(w) {
      return w.subSkill && w.subSkill.toLowerCase() === currentSubSkill.toLowerCase();
    });
  }
  if (currentPhone === "smartphone") {
    workers = workers.filter(function(w) { return w.hasSmartphone; });
  } else if (currentPhone === "basic") {
    workers = workers.filter(function(w) { return !w.hasSmartphone; });
  } else if (currentPhone === "verified") {
    workers = workers.filter(function(w) { return w.aadhaarVerified; });
  }
  if (currentSearch) {
    workers = workers.filter(function(w) {
      return w.name.toLowerCase().indexOf(currentSearch) !== -1
        || w.skill.toLowerCase().indexOf(currentSearch) !== -1
        || (w.subSkill && w.subSkill.toLowerCase().indexOf(currentSearch) !== -1);
    });
  }
  if (currentSort === "rating") {
    workers.sort(function(a, b) { return b.averageRating - a.averageRating; });
  } else if (currentSort === "newest") {
    workers.sort(function(a, b) { return b.createdAt - a.createdAt; });
  } else if (currentSort === "available") {
    workers.sort(function(a, b) {
      if (b.available !== a.available) return b.available ? 1 : -1;
      return b.averageRating - a.averageRating;
    });
  } else {
    workers.sort(function(a, b) {
      if (b.aadhaarVerified !== a.aadhaarVerified) return b.aadhaarVerified ? 1 : -1;
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return b.createdAt - a.createdAt;
    });
  }
  return workers;
}

var LOAD_SIZE = 20;
var loadedCount = LOAD_SIZE;

function renderGrid() {
  var grid    = document.getElementById("browseGrid");
  var count   = document.getElementById("resultsCount");
  var workers = getFilteredWorkers();
  loadedCount = LOAD_SIZE;

  if (workers.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:span 2"><p>No providers found</p></div>';
    count.textContent = "No providers found";
    return;
  }

  var visible = workers.slice(0, loadedCount);
  var html = visible.map(buildWorkerCard).join("");
  if (workers.length > loadedCount) {
    html += '<button class="load-more-btn" onclick="loadMore()" style="grid-column:span 2;display:block;width:100%;padding:14px;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);font-size:14px;font-weight:700;color:var(--primary);margin-top:4px;cursor:pointer;">Load More (' + (workers.length - loadedCount) + ' remaining)</button>';
  }
  grid.innerHTML = html;
  count.textContent = "Showing " + visible.length + " of " + workers.length + " worker" + (workers.length === 1 ? "" : "s");
}

function loadMore() {
  var workers = getFilteredWorkers();
  loadedCount += LOAD_SIZE;
  var visible = workers.slice(0, loadedCount);
  var grid = document.getElementById("browseGrid");
  var count = document.getElementById("resultsCount");
  var html = visible.map(buildWorkerCard).join("");
  if (workers.length > loadedCount) {
    html += '<button class="load-more-btn" onclick="loadMore()" style="grid-column:span 2;display:block;width:100%;padding:14px;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);font-size:14px;font-weight:700;color:var(--primary);margin-top:4px;cursor:pointer;">Load More (' + (workers.length - loadedCount) + ' remaining)</button>';
  }
  grid.innerHTML = html;
  count.textContent = "Showing " + visible.length + " of " + workers.length + " worker" + (workers.length === 1 ? "" : "s");
}

function filterSkill(skill) {
  currentSkill = skill;
  currentSubSkill = "all";
  document.querySelectorAll(".skill-tab").forEach(function(btn) {
    btn.classList.remove("active");
    if (btn.getAttribute("data-skill") === skill) btn.classList.add("active");
  });
  document.getElementById("subTabsWrap").style.display = "none";
  renderGrid();
}

function toggleSubTabs(skill) {
  currentSubSkill = "all";
  if (currentSkill === skill) {
    currentSkill = "all";
    document.querySelectorAll(".skill-tab").forEach(function(btn) {
      btn.classList.remove("active");
      if (btn.getAttribute("data-skill") === "all") btn.classList.add("active");
    });
    document.getElementById("subTabsWrap").style.display = "none";
    renderGrid();
    return;
  }
  currentSkill = skill;
  document.querySelectorAll(".skill-tab").forEach(function(btn) {
    btn.classList.remove("active");
    if (btn.getAttribute("data-skill") === skill) btn.classList.add("active");
  });
  var subs = SUB_SKILLS[skill] || [];
  var subTabsEl = document.getElementById("subTabs");
  var skillForNav = skill;
  subTabsEl.innerHTML = subs.map(function(s) {
    return '<button class="sub-tab' + (s === "All" ? " active" : "") + '" data-sub="' + s + '">' + s + '</button>';
  }).join("");
  setTimeout(function() {
    var activeBtn = subTabsEl.querySelector(".sub-tab.active");
    if (activeBtn) activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, 50);
  subTabsEl.onclick = function(e) {
    var btn = e.target.tagName === "BUTTON" ? e.target : null;
    if (!btn) return;
    var sub = btn.getAttribute("data-sub");
    if (!sub) return;
    if (sub === "All") {
      window.location.href = "browse.html?skill=" + encodeURIComponent(skillForNav);
    } else {
      window.location.href = "browse.html?skill=" + encodeURIComponent(skillForNav) + "&sub=" + encodeURIComponent(sub);
    }
  };
  renderGrid();
}

function filterPhone(type) {
  currentPhone = type;
  document.getElementById("filterAll").classList.remove("active");
  document.getElementById("filterSmp").classList.remove("active");
  document.getElementById("filterNosmp").classList.remove("active");
  document.getElementById("filterVerified").classList.remove("active");
  if (type === "all")        document.getElementById("filterAll").classList.add("active");
  if (type === "smartphone") document.getElementById("filterSmp").classList.add("active");
  if (type === "basic")      document.getElementById("filterNosmp").classList.add("active");
  if (type === "verified")   document.getElementById("filterVerified").classList.add("active");
  renderGrid();
}

function handleSort(value) {
  currentSort = value;
  renderGrid();
}

var browseSearchTimeout = null;
function handleBrowseSearch(query) {
  clearTimeout(browseSearchTimeout);
  browseSearchTimeout = setTimeout(function() {
    currentSearch = query.trim().toLowerCase();
    renderGrid();
  }, 300);
}

document.addEventListener("DOMContentLoaded", async function() {
  readURLParams();
  /* Load all workers from Supabase */
  _browseWorkers = await getAllWorkersAsync();
  /* Sync to global cache too */
  _cachedWorkers = _browseWorkers;
  renderGrid();
});
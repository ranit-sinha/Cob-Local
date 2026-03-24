/* COBLOCAL -- FAVOURITES.JS */

async function loadFavourites() {
  var grid     = document.getElementById("favGrid");
  var empty    = document.getElementById("favEmpty");
  var clearBtn = document.getElementById("favClearBtn");
  var countEl  = document.getElementById("favCountText");

  var ids = getFavourites();

  if (ids.length === 0) {
    grid.style.display    = "none";
    empty.style.display   = "flex";
    clearBtn.style.display = "none";
    countEl.textContent   = "";
    return;
  }

  /* Fetch all favourited workers from Supabase */
  var workers = [];
  try {
    var results = await window.supabaseGet("workers", "id=in.(" + ids.join(",") + ")");
    if (results && !results.error) {
      workers = results.map(function(w) { return workerFromSupabase(w); });
    }
  } catch(err) {
    console.error("loadFavourites error:", err);
  }

  if (workers.length === 0) {
    grid.style.display    = "none";
    empty.style.display   = "flex";
    clearBtn.style.display = "none";
    countEl.textContent   = "";
    return;
  }

  grid.style.display    = "grid";
  empty.style.display   = "none";
  clearBtn.style.display = "inline-block";
  countEl.textContent   = workers.length + " saved provider" + (workers.length === 1 ? "" : "s");
  grid.innerHTML        = workers.map(buildWorkerCard).join("");
}

function clearAllFavourites() {
  localStorage.setItem("ctj_favourites", "[]");
  showToast("Favourites cleared");
  loadFavourites();
}

document.addEventListener("DOMContentLoaded", function() {
  loadFavourites();
});
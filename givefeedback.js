/* COBLOCAL -- GIVEFEEDBACK.JS */

var selectedRating    = 0;
var feedbackWorkerId  = null;
var feedbackHirerName = null;
var feedbackHirerPhone = null;
var starLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

function getDayToken() {
  var now = new Date();
  var adjusted = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  var y = adjusted.getFullYear();
  var m = String(adjusted.getMonth() + 1).padStart(2, "0");
  var d = String(adjusted.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

async function alreadyReviewedToday(workerId, hirerUid) {
  if (!hirerUid) return true;
  try {
    var token = getDayToken();
    var snap = await window.firestoreGetDocs(
      window.firestoreQuery(
        window.firestoreCollection(window.firebaseDb, "feedbacks"),
        window.firestoreWhere("workerId", "==", workerId),
        window.firestoreWhere("hirerId", "==", hirerUid)
      )
    );
    var found = false;
    snap.forEach(function(doc) {
      var f = doc.data();
      var fAdj = new Date(f.date - 3 * 60 * 60 * 1000);
      var ft = fAdj.getFullYear() + "-" + String(fAdj.getMonth()+1).padStart(2,"0") + "-" + String(fAdj.getDate()).padStart(2,"0");
      if (ft === token) found = true;
    });
    return found;
  } catch(err) {
    console.error("alreadyReviewed error:", err);
    return false;
  }
}

document.addEventListener("DOMContentLoaded", async function() {
  var params   = new URLSearchParams(window.location.search);
  var workerId = params.get("id");
  if (!workerId) { window.location.href = "browse.html"; return; }

  feedbackWorkerId = workerId;
  var hirerSession = localStorage.getItem("ctj_hirer_session");
  if (!hirerSession) {
    window.location.href = "hirerauth.html?next=givefeedback&id=" + workerId;
    return;
  }

  /* Get hirer name from Firestore */
  try {
    var hirerDoc = await window.firestoreGetDoc(window.firestoreDoc(window.firebaseDb, "hirers", hirerSession));
    if (hirerDoc.exists()) {
      feedbackHirerName = hirerDoc.data().name;
      feedbackHirerPhone = hirerDoc.data().phone;
    }
  } catch(err) { console.error(err); }

  /* Find worker from Supabase */
  var results = await window.supabaseGet("workers", "id=eq." + workerId);
  if (!results || results.length === 0) { window.location.href = "browse.html"; return; }
  var worker = workerFromSupabase(results[0]);

  /* Check already reviewed today */
  if (await alreadyReviewedToday(workerId, hirerSession)) {
    document.getElementById("alreadyReviewed").style.display = "block";
    return;
  }

  var photoHTML = worker.photoURL ? '<img src="' + worker.photoURL + '" alt="">' : worker.name.charAt(0).toUpperCase();
  var skillDisplay = worker.subSkill ? worker.skill + " | " + worker.subSkill : worker.skill;
  document.getElementById("fbWorkerCard").innerHTML =
    '<div class="fb-worker-photo">' + photoHTML + '</div>'
    + '<div><div class="fb-worker-name">' + worker.name + '</div><div class="fb-worker-skill">' + skillDisplay + '</div></div>';

  document.getElementById("feedbackWrap").style.display = "block";

  var commentEl = document.getElementById("fbComment");
  var countEl   = document.getElementById("fbCommentCount");
  commentEl.addEventListener("input", function() {
    countEl.textContent = commentEl.value.length + " / 300";
  });
});

function selectStar(val) {
  selectedRating = val;
  document.getElementById("starLabel").textContent = starLabels[val];
  document.querySelectorAll(".star-btn").forEach(function(btn) {
    var btnVal = parseInt(btn.getAttribute("data-val"));
    btn.classList.remove("selected");
    btn.innerHTML = btnVal <= val ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    if (btnVal <= val) btn.classList.add("selected");
  });
  document.getElementById("errStar").textContent = "";
}

async function submitFeedback() {
  document.getElementById("errStar").textContent    = "";
  document.getElementById("errComment").textContent = "";

  if (selectedRating === 0) {
    document.getElementById("errStar").textContent = "Please select a rating";
    return;
  }

  var submitBtn = document.querySelector(".reg-btn-accent");
  if (submitBtn && submitBtn.disabled) return;
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Submitting..."; }

  var hirerSession = localStorage.getItem("ctj_hirer_session");
  if (await alreadyReviewedToday(feedbackWorkerId, hirerSession)) {
    document.getElementById("errStar").textContent = "You have already reviewed this worker today";
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Submit Feedback"; }
    return;
  }

  var comment = document.getElementById("fbComment").value.trim();
  var feedback = {
    id:         "fb_" + Date.now(),
    workerId:   feedbackWorkerId,
    hirerId:    hirerSession,
    hirerName:  feedbackHirerName || "Customer",
    hirerPhone: feedbackHirerPhone || "",
    rating:     selectedRating,
    comment:    comment,
    date:       Date.now()
  };

  try {
    await window.firestoreAddDoc(
      window.firestoreCollection(window.firebaseDb, "feedbacks"),
      feedback
    );

    document.getElementById("feedbackWrap").style.display   = "none";
    document.getElementById("feedbackSuccess").style.display = "block";
  } catch(err) {
    console.error("Submit feedback error:", err);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Submit Feedback"; }
  }
}
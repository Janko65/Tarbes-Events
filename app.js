const timeline = document.getElementById("timeline");
const indicator = document.getElementById("time-indicator");

let store = JSON.parse(localStorage.getItem("decisions") || "{}");

fetch("ai_inbox.json")
  .then(r => r.json())
  .then(data => init(data.events));

function init(events) {
  events
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .forEach(renderEvent);

  updateTimeIndicator();
  setupFilters();
}

function renderEvent(ev) {
  const div = document.createElement("div");

  const now = new Date();
  let state;

  // déterminer si l'événement est terminé
  if (new Date(ev.end) < now) {
    state = "hidden";
    store[ev.id] = "hidden"; // mémoriser
  } else {
    if (store[ev.id] === "hidden") {
      state = "hidden";
    } else {
      state = ev.status || ""; // visible
    }
  }

  div.className = `event ${ev.type} ${state}`;
  if (ev.duplicate) div.classList.add("duplicate");

  div.dataset.start = ev.start;
  div.dataset.end = ev.end;

  // HTML de l'événement
  let contentHTML;

  if (state === "hidden") {
    // Événement passé : uniquement "Terminé le ..."
    contentHTML = `
      <strong>${ev.title}</strong>
      <div class="ended-date">Terminé le : ${formatFR(ev.end)}</div>
    `;
  } else {
    // Événement en cours ou futur : affichage normal
    contentHTML = `
      <strong>${ev.title}</strong>
      <div>${formatFR(ev.start)} → ${formatFR(ev.end)}</div>
      <small class="distance">${ev.distance} km</small>
      ${ev.location ? `<small class="location">${ev.location}</small>` : ''}
    `;
  }

  div.innerHTML = contentHTML;

  enableLongPress(div, ev);

  timeline.appendChild(div);

  localStorage.setItem("decisions", JSON.stringify(store));
}
function enableLongPress(el, ev) {
  let timer;
  el.addEventListener("touchstart", () => timer = setTimeout(() => showURL(el, ev.source), 2000));
  el.addEventListener("touchend", () => clearTimeout(timer));
  el.addEventListener("touchmove", () => clearTimeout(timer));
}

function showURL(el, url) {
  if (el.querySelector(".url-box")) return;
  const box = document.createElement("div");
  box.className = "url-box";
  box.textContent = url;
  el.appendChild(box);
}

function updateTimeIndicator() {
  const evs = document.querySelectorAll(".event");
  for (const ev of evs) {
    const r = ev.getBoundingClientRect();
    if (r.top >= 0 && ev.style.display !== "none") {
      indicator.textContent = relativeLabel(ev.dataset.start, ev.dataset.end);
      break;
    }
  }
}

window.addEventListener("scroll", updateTimeIndicator);

/* ===== FILTRAGE PAR BOUTONS ===== */
function setupFilters() {
  const filterButtons = document.querySelectorAll("#filters button");

  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter; // all, culture, association, etc.
      const events = document.querySelectorAll(".event");

      events.forEach(ev => {
        if (filter === "all" || ev.classList.contains(filter)) {
          ev.style.display = ""; // visible (reste grisé si hidden)
        } else {
          ev.style.display = "none"; // cacher uniquement pour le filtrage
        }
      });

      updateTimeIndicator(); // mettre à jour l'indicateur après filtrage
    });
  });
}

/* ===== HELPERS ===== */
function formatFR(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function relativeLabel(dateStart, dateEnd) {
  const now = new Date();
  const start = new Date(dateStart);
  const end = new Date(dateEnd);

  if (start <= now && end >= now) return "En cours"; // événement en cours
  if (end < now) return "Passé";                     // terminé

  const diffDays = Math.floor((start - now) / 86400000); // nombre de jours jusqu'au début

  if (diffDays === 0) return "Aujourd’hui";
  if (diffDays <= 7) return `Dans ${diffDays} jour(s)`;
  if (diffDays <= 14) return "Dans 1 semaine";
  if (diffDays <= 21) return "Dans 2 semaines";
  if (diffDays <= 28) return "Dans 3 semaines";
  return "Dans +1 mois";
}
document.getElementById("reset-store").addEventListener("click", () => {
  localStorage.removeItem("decisions");
  location.reload(); // recharge la page pour appliquer
});
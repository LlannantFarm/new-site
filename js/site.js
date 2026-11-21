/* Llannant Farm test site
 *
 * data/site.json     seasons (open days), the farm tours switch, the notice bar, visit details
 * data/reviews.json  the Facebook reviews
 *
 * Page addresses can carry test switches:
 *   ?tours=on                 show the farm tours and their Book buttons, whatever site.json says
 *   ?now=2027-08-14T11:00     see the page as it would be at that date and time (UK)
 *   ?tbc=0                    hide the yellow "still to confirm" highlights
 */
(function () {
  var params = new URLSearchParams(location.search);
  var root = document.documentElement;
  // Data files sit beside this script's folder; working from the script's own address means
  // the "page not found" page still finds them whatever address it is shown at.
  var base = document.currentScript ? new URL("../", document.currentScript.src).href : "";
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (params.get("tbc") === "0") root.classList.add("no-tbc");

  // Keep the test switches when moving between pages
  var keep = ["tours", "now", "tbc"].filter(function (k) { return params.has(k); });
  if (keep.length) {
    document.querySelectorAll('a[href*=".html"]').forEach(function (a) {
      if (/^[a-z]+:/i.test(a.getAttribute("href"))) return;   // leave links to other websites alone
      var u = new URL(a.getAttribute("href"), location.href);
      keep.forEach(function (k) { u.searchParams.set(k, params.get(k)); });
      a.href = u.pathname + u.search + u.hash;
    });
  }

  // Phone menu
  var toggle = document.querySelector(".nav-toggle"), nav = document.querySelector(".nav");
  if (toggle && nav) toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav && nav.classList.contains("open")) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); toggle.focus(); }
  });

  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // ---------- UK date helpers ----------
  function ukNow() {
    var m = (params.get("now") || "").match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{1,2}):(\d{2}))?$/);
    if (m) return { date: m[1], mins: m[2] ? (+m[2]) * 60 + (+m[3]) : 12 * 60 };
    var p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + "-" + p.month + "-" + p.day, mins: (+p.hour) * 60 + (+p.minute) };
  }
  function toMins(t) { var a = t.split(":"); return (+a[0]) * 60 + (+a[1]); }
  function niceTime(t) { var a = t.split(":"), h = +a[0], m = a[1]; return (h % 12 || 12) + (m !== "00" ? ":" + m : "") + (h < 12 ? "am" : "pm"); }
  function niceDate(d) { var x = new Date(d + "T12:00:00Z"); return DAYS[x.getUTCDay()] + " " + x.getUTCDate() + " " + MONTHS[x.getUTCMonth()]; }

  // Open now / next open day / back next season, from the dates in site.json
  function seasonState(s, now) {
    var dates = (s.dates || []).slice().sort();
    if (dates.indexOf(now.date) >= 0 && now.mins >= toMins(s.open) && now.mins < toMins(s.close)) {
      return { cls: "open", pill: "Open now", text: s.name + " is open today until " + niceTime(s.close) };
    }
    var next = dates.filter(function (d) { return d > now.date || (d === now.date && now.mins < toMins(s.open)); })[0];
    if (next) return { cls: "soon", pill: "Next: " + niceDate(next), text: s.name + " opens " + niceDate(next) + ", " + niceTime(s.open) + "–" + niceTime(s.close) };
    var year = now.date.slice(0, 4), month = +now.date.slice(5, 7);
    // Any dates left in the list for this year are now in the past, so this year's season is over
    var doneThisYear = dates.some(function (d) { return d.slice(0, 4) === year; });
    if (!doneThisYear && s.months.indexOf(month) >= 0) {
      return { cls: "soon", pill: "Dates coming soon", nodate: true, text: s.name + ": open days coming soon. Check here or on Facebook." };
    }
    // "{year}" in nextSeason becomes this year, or next year once this year's season has gone
    var last = Math.max.apply(null, s.months);
    var back = s.nextSeason.replace("{year}", (doneThisYear || month > last) ? +year + 1 : +year);
    return { cls: "", pill: "Back " + back, back: back, text: s.name + ": back " + back };
  }

  function renderCalendar(el, seasons, now) {
    var month = +now.date.slice(5, 7);
    var head = '<div class="cal-row cal-head"><span></span>' + MONTHS.map(function (m, i) {
      return '<span><span class="m-long">' + m.slice(0, 3) + '</span><span class="m-short">' + m[0] + "</span></span>";
    }).join("") + "</div>";
    var rows = seasons.map(function (s) {
      var cells = "";
      for (var i = 1; i <= 12; i++) {
        var on = s.months.indexOf(i) >= 0;
        cells += '<div class="cal-cell' + (on ? " on" : "") + (on && s.main ? " main" : "") + (on && s.id === "pumpkins" ? " pumpkin" : "") + (i === month ? " now" : "") + '" title="' + MONTHS[i - 1] + '"></div>';
      }
      return '<div class="cal-row"><div class="label">' + esc(s.name) + "</div>" + cells + "</div>";
    }).join("");
    // The coloured grid is for sighted visitors; screen readers get the same information as a list
    var said = '<ul class="sr-only">' + seasons.map(function (s) {
      return "<li>" + esc(s.name) + ": " + s.months.map(function (m) { return MONTHS[m - 1]; }).join(" and ") + "</li>";
    }).join("") + "</ul>";
    el.innerHTML = said + '<div aria-hidden="true">' + head + rows + "</div>" +
      '<p class="cal-note">The outlined box is this month. Exact open days depend on the weather and the crop, so we post them here and on Facebook as soon as we know.</p>';
  }

  function applySeasons(data) {
    var now = ukNow();
    var states = {};
    data.seasons.forEach(function (s) { states[s.id] = seasonState(s, now); });
    document.querySelectorAll("[data-season]").forEach(function (el) {
      var st = states[el.getAttribute("data-season")];
      if (!st) return;
      el.className = "pill " + st.cls;
      el.textContent = st.pill;
    });
    // "(back in 2027)" after a heading; empty once dates are set or the season is open
    document.querySelectorAll("[data-season-back]").forEach(function (el) {
      var st = states[el.getAttribute("data-season-back")];
      el.textContent = st && st.back ? "(back " + st.back + ")" : "";
    });
    document.querySelectorAll("[data-calendar]").forEach(function (el) { renderCalendar(el, data.seasons, now); });
    var line = document.querySelector("[data-status-line]");
    if (line) {
      var open = data.seasons.filter(function (s) { return states[s.id].cls === "open"; });
      var soon = data.seasons.filter(function (s) { return states[s.id].cls === "soon"; });
      // Tours with no date yet don't drive this line: it's about what you can come and pick
      soon = soon.filter(function (s) { return !(s.id === "tours" && states[s.id].nodate); });
      if (open.length) line.textContent = open.map(function (s) { return states[s.id].text; }).join(" · ");
      else if (soon.length) line.textContent = soon.map(function (s) { return states[s.id].text; }).join(" · ");
      else {
        // Nothing open or dated: say which pick-your-own season comes round next
        var month = +now.date.slice(5, 7);
        var crops = data.seasons.filter(function (s) { return s.id !== "tours"; });
        var nextUp = crops.slice().sort(function (a, b) {
          return ((a.months[0] - month + 12) % 12) - ((b.months[0] - month + 12) % 12);
        })[0];
        var closed = (month >= 11 || month <= 3) ? "Closed for the winter. " : "Closed at the moment. ";
        line.textContent = closed + (nextUp.main ? "Pick your own is back in " + states[nextUp.id].back + "."
          : "Next up: " + nextUp.name + ", " + states[nextUp.id].back + ".");
      }
    }
  }

  function applyTours(t) {
    var on = t.active || params.get("tours") === "on";
    root.classList.toggle("tours-on", on);
    root.classList.toggle("tours-off", !on);
    var booking = on && ((t.bookingOpen && t.bookingUrl) || params.get("tours") === "on");
    root.classList.toggle("booking-open", !!booking);
    document.querySelectorAll("[data-booking-link]").forEach(function (a) { a.href = t.bookingUrl; });
    document.querySelectorAll("[data-tours-summary]").forEach(function (el) { el.textContent = t.summary; });
    document.querySelectorAll("[data-tours-details]").forEach(function (el) {
      el.innerHTML = t.details.map(function (d) { return "<li>" + d + "</li>"; }).join("");
    });
  }

  // Notice bar for closures and news: "notice": { "message": "...", "link": "..." } in site.json
  function applyNotice(n) {
    if (!n || !n.message) return;
    var bar = document.createElement("div");
    bar.className = "notice";
    bar.setAttribute("role", "status");
    bar.textContent = n.message + " ";
    if (n.link) {
      var a = document.createElement("a");
      a.href = n.link;
      a.textContent = n.linkText || "More details";
      bar.appendChild(a);
    }
    var header = document.querySelector(".site-header");
    header.parentNode.insertBefore(bar, header);
  }

  function applyVisit(v) {
    // The farm's own Google listing if we have it; otherwise a search for the postcode
    var maps = v.mapsUrl || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(v.postcode);
    document.querySelectorAll("[data-maps]").forEach(function (a) { a.href = maps; });
  }

  // ---------- Reviews ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function applyReviews(r) {
    document.querySelectorAll("[data-review-summary]").forEach(function (el) {
      el.innerHTML = '<span class="stars" aria-hidden="true">★★★★★</span><span>' + esc(r.summary) + " · " + r.count + ' reviews on Facebook</span>';
    });
    document.querySelectorAll("[data-review-count]").forEach(function (el) { el.textContent = r.count; });
    document.querySelectorAll("[data-reviews]").forEach(function (el) {
      var limit = +el.getAttribute("data-limit") || r.items.length;
      el.innerHTML = r.items.slice(0, limit).map(function (it) {
        return '<blockquote class="review"><p>' + esc(it.text) + "</p><cite>" + esc(it.name) + "</cite></blockquote>";
      }).join("");
    });
  }

  // ---------- Photo lightbox ----------
  var box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Enlarged photo");
  box.innerHTML = '<button type="button">Close ✕</button><img alt=""><p></p>';
  document.body.appendChild(box);
  var closeBtn = box.querySelector("button"), big = box.querySelector("img"), opener = null;
  big.addEventListener("load", function () { big.style.visibility = "visible"; });
  big.addEventListener("error", function () { big.style.visibility = "visible"; });
  function closeBox() {
    if (!box.classList.contains("open")) return;
    box.classList.remove("open");
    document.body.style.overflow = "";
    if (opener) opener.focus();   // back to the photo that was opened
  }
  box.addEventListener("click", function (e) { if (e.target === box || e.target === closeBtn) closeBox(); });
  document.addEventListener("keydown", function (e) {
    if (!box.classList.contains("open")) return;
    if (e.key === "Escape") closeBox();
    if (e.key === "Tab") { e.preventDefault(); closeBtn.focus(); }   // keep keyboard focus inside the viewer
  });
  document.querySelectorAll(".mosaic figure, .gallery figure").forEach(function (f) {
    var img = f.querySelector("img"), cap = f.querySelector("figcaption");
    f.tabIndex = 0;
    f.setAttribute("role", "button");
    f.setAttribute("aria-label", "Enlarge photo: " + (cap ? cap.textContent : img.alt));
    function open() {
      opener = f;
      // A different photo from last time: hide the picture until it has loaded, so the old one
      // doesn't show under the new caption
      var url = img.getAttribute("data-full") || img.src;
      big.alt = img.alt;
      if (big.src !== url) {
        big.style.visibility = "hidden";
        big.src = url;
        if (big.complete && big.naturalWidth) big.style.visibility = "visible";   // already downloaded
      }
      box.querySelector("p").textContent = cap ? cap.textContent : img.alt;
      box.classList.add("open");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    }
    f.addEventListener("click", open);
    f.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });

  // ---------- Old film: load YouTube only when someone presses play ----------
  document.querySelectorAll("[data-youtube]").forEach(function (v) {
    var btn = v.querySelector(".video-play");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + v.getAttribute("data-youtube") + "?autoplay=1";
      f.title = v.getAttribute("data-title") || "Video";
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      v.innerHTML = "";
      v.appendChild(f);
      f.focus();
    });
  });

  // ---------- Load the data ----------
  fetch(base + "data/site.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (data) {
    applyNotice(data.notice);
    applyTours(data.tours);
    applySeasons(data);
    applyVisit(data.visit);
  }).catch(function (e) {
    console.error("site.json", e);
    var line = document.querySelector("[data-status-line]");
    if (line) line.textContent = "Open days are posted on our Facebook page.";
    document.querySelectorAll("[data-season], [data-calendar]").forEach(function (el) { el.remove(); });
  });

  if (document.querySelector("[data-reviews], [data-review-summary], [data-review-count]")) {
    fetch(base + "data/reviews.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(applyReviews)
      .catch(function (e) { console.error("reviews.json", e); });
  }
})();

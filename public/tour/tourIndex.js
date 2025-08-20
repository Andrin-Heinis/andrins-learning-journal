function buildSteps() {
  const links = document.getElementById("links");
  const btns = links
    ? Array.from(links.querySelectorAll(".btn")).slice(0, 3)
    : [];
  const labels = [
    "Here you can see my last journal entry.",
    "Here you can see my grades from this semester.",
    "And here you can see my school class table.",
  ];

  const steps = [
    { intro: "Small Tour :)", position: "right" },
    ...btns.map((el, i) => ({
      element: el,
      intro: labels[i] || "Wichtiger Button.",
      position: "right",
    })),
  ];

  return steps;
}
function startTourInternal() {
  const steps = buildSteps();
  introJs()
    .setOptions({
      nextLabel: "Continue",
      prevLabel: "Back",
      doneLabel: "Finish",
      steps,
    })
    .oncomplete(function () {
      localStorage.setItem("journal_tour_seen", "1");
    })
    .onexit(function () {
      localStorage.setItem("journal_tour_seen", "1");
    })
    .start();
}

window.startTour = function (force = false) {
  if (!force && localStorage.getItem("journal_tour_seen")) return;
  if (typeof introJs !== "function") return;
  startTourInternal();
};

window.addEventListener("load", function () {
  const url = new URL(location.href);
  if (url.searchParams.get("tour") === "1") {
    localStorage.removeItem("journal_tour_seen");
    window.startTour(true);
    return;
  }
  if (!localStorage.getItem("journal_tour_seen"))
    setTimeout(function () {
      window.startTour();
    }, 800);
});

function startTour() {
  const btns = [...document.querySelectorAll("#links a, #links .btn")].slice(
    0,
    3
  );
  const labels = [
    "Here you can see my last journal entry.",
    "Here you can see my grades from this semester.",
    "And here you can see my school class table.",
  ];
}

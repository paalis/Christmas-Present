/* Innstillinger for siden. Brukes både i nettleseren og i /api/send. */
(function (cfg) {
  if (typeof module !== "undefined" && module.exports) module.exports = cfg;
  else window.CFG = cfg;
})({
  navn: "Ingrid",
  hilsen: "Hei Ingrid!\nJeg lurer på om du kan holde av noen datoer for meg? 😊",

  // Forslaget som vises øverst: [første dag, siste dag]
  forslag: ["2027-01-21", "2027-01-24"],

  // Reserver hun kan velge med ett trykk: liste av [første dag, siste dag]
  reserver: [
    ["2027-01-07", "2027-01-10"],
  ],

  // Egne valg i kalenderen
  kalenderTekst: "Trykk på en torsdag (fra kvelden), og så på søndag eller mandag.",
  startdager: [4],          // 0 = søndag … 4 = torsdag … 6 = lørdag
  minLengde: 3,             // antall dager fra første til siste dag (to → sø)
  maksLengde: 4,            // (to → ma)
  tidligsteDato: "2027-01-07",
  senesteDato: "2027-06-30",
  utilgjengelig: [
    // "2027-02-14",
    // "2027-03-22/2027-04-05",
  ],
});

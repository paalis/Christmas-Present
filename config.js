/* =========================================================
   ✏️  REDIGER DENNE FILA – alt det personlige ligger her
   ========================================================= */
window.TUR = {
  // Hvem gaven er til / fra
  til: "Ingrid",
  fra: "Meg",

  // Hilsen som vises når konvolutten åpnes (\n = ny linje)
  hilsen: "God jul, kjære deg!\nI år får du ikke en pakke – du får en reise.\nHvor vi skal? Det er en overraskelse.\nMen NÅR vi skal, får du bestemme selv.",

  // Destinasjonen holdes hemmelig. Hint vises på billetten.
  destinasjonHint: "Et sted med god mat og lange kvelder",

  // Antall netter turen varer. Sett til null hvis hun skal velge både
  // avreise og hjemreise fritt (da gjelder minNetter/maksNetter).
  netter: null,
  minNetter: 3,   // torsdag → søndag
  maksNetter: 4,  // torsdag → mandag

  // Tidsrommet hun kan velge innenfor (ÅÅÅÅ-MM-DD)
  tidligsteDato: "2027-01-07",   // ⚠️ juster når dere vet mer
  senesteDato: "2027-06-30",

  // Hvilke ukedager turen kan starte på. 0=søn, 1=man … 5=fre, 6=lør.
  // null = alle dager. Eksempel: [4, 5] = torsdag eller fredag.
  avreisedager: [4],   // torsdag kveld

  // Teksten over kalenderen (la stå tom for standardtekst)
  kalenderTekst: "Velg en torsdag – vi drar på kvelden. Trykk så på søndag eller mandag for hjemreise.",

  // Datoer som IKKE går (enkeltdager eller perioder "fra/til")
  utilgjengelig: [
    // "2027-02-14",
    // "2027-03-22/2027-04-05",
  ],

  // Hvordan svaret kommer fram til deg (fyll inn det du vil bruke):
  telefon: "",        // f.eks. "+4799999999" → knapp for å sende SMS
  epost: "",          // f.eks. "deg@eksempel.no" → knapp for å sende e-post
  formspree: "",     // valgfritt: "https://formspree.io/f/xxxxxxx" → du får svaret automatisk på e-post
  ntfy: "julebillett-2f0bd5e90389", // push-varsel rett på mobilen din (se README)

  // Adressen siden ligger på (brukes til QR-koden i qr.html).
  // La stå tom for å bruke adressen qr.html åpnes fra.
  nettadresse: "",
};

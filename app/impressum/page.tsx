export default function ImpressumPage() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>
      <h1>Impressum</h1>

      <h3>Angaben gemäß § 5 TMG</h3>
      <p>
        [Name der Schule / Institution]<br />
        [Straße und Hausnummer]<br />
        [PLZ und Ort]
      </p>

      <h3>Vertreten durch</h3>
      <p>[Name der verantwortlichen Person / Schulleitung]</p>

      <h3>Kontakt</h3>
      <p>
        Telefon: [Telefonnummer]<br />
        E-Mail: [E-Mail-Adresse]
      </p>

      <h3>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
      <p>[Name, Adresse wie oben]</p>

      <p style={{ color: "#888", fontSize: "0.85rem", marginTop: "2rem" }}>
        Hinweis: Dies ist eine Platzhalter-Seite. Bitte ersetze die eckigen Klammern durch die
        tatsächlichen Angaben deiner Schule bzw. Institution, bevor die Anwendung produktiv
        eingesetzt wird.
      </p>
    </div>
  );
}

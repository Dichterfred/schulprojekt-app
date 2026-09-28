export default function DatenschutzPage() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>
      <h1>Datenschutzerklärung</h1>

      <h3>1. Verantwortlicher</h3>
      <p>
        Verantwortlich für die Datenverarbeitung auf dieser Plattform ist
        [Name der Schule / Institution], [Adresse], [Kontakt].
      </p>

      <h3>2. Welche Daten werden verarbeitet?</h3>
      <p>
        Im Rahmen der Nutzung dieser Anwendung werden folgende Daten verarbeitet: Benutzername
        und Passwort (Lehrer und Super User), Vorname und Nachname sowie die Zuordnung zu einem
        Projekt (Schüler), sowie die von Schülern vergebenen Gruppen-Prioritäten.
      </p>

      <h3>3. Zweck der Verarbeitung</h3>
      <p>
        Die Daten werden ausschließlich zur Organisation von Schulprojekten, Gruppen und der
        Gruppen-Einschreibung von Schülern verwendet.
      </p>

      <h3>4. Speicherdauer</h3>
      <p>
        Die Daten werden nur so lange gespeichert, wie es für die Durchführung des jeweiligen
        Schulprojekts erforderlich ist, und anschließend gelöscht.
      </p>

      <h3>5. Rechte der betroffenen Personen</h3>
      <p>
        Betroffene Personen haben das Recht auf Auskunft, Berichtigung, Löschung und
        Einschränkung der Verarbeitung ihrer personenbezogenen Daten. Wende dich hierzu an die
        im Impressum genannte verantwortliche Stelle.
      </p>

      <p style={{ color: "#888", fontSize: "0.85rem", marginTop: "2rem" }}>
        Hinweis: Dies ist eine Platzhalter-Seite. Bitte passe den Text an die tatsächliche
        Datenverarbeitung und die rechtlichen Anforderungen deiner Schule bzw. Institution an,
        bevor die Anwendung produktiv eingesetzt wird.
      </p>
    </div>
  );
}

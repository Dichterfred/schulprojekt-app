import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    if (session.user.role === "STUDENT") redirect("/student");
    redirect("/projects");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f4f5f7" }}>
      <div className="card" style={{ maxWidth: 400, textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Schulprojekt Verwaltung</h2>
        <p style={{ color: "#555" }}>Bitte wähle deine Anmeldeart aus.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginTop: "1.2rem" }}>
          <Link href="/lehrer"><button style={{ width: "100%" }}>Anmeldung für Lehrer</button></Link>
          <Link href="/schueler"><button className="secondary" style={{ width: "100%" }}>Anmeldung für Schüler</button></Link>
        </div>
      </div>
    </div>
  );
}

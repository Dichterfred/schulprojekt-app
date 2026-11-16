import { notFound } from "next/navigation";
import AlgorithmPlayground from "./AlgorithmPlayground";

/** Entwickler-Seite zum Testen des Zuteilungsalgorithmus – in Prod nicht erreichbar. */
export default function AlgorithmTestPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AlgorithmPlayground />;
}

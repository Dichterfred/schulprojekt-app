/**
 * Rendert eine Beschreibung mit Markdown-ähnlichen Links.
 * Syntax: [Linktext](https://example.com)
 * Sicherheit: Nur http:// und https:// Links werden als <a> gerendert,
 * alles andere (javascript:, data:, etc.) wird als Plain-Text ausgegeben.
 */
export default function DescriptionRenderer({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#2563eb", textDecoration: "underline" }}
      >
        {match[1]}
      </a>
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return (
    <p style={{ color: "#555", whiteSpace: "pre-wrap" }}>
      {parts}
    </p>
  );
}

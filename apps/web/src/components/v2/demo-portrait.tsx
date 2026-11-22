import { Avatar } from "../ui";
import expressive from "./patient-discovery-signature.module.css";

/** Temporary preview substitution: initials only until licensed/verified portraits exist. */
export function ProviderPortrait({
  providerId: _providerId,
  name,
  discovery = false,
}: {
  providerId: string;
  name: string;
  discovery?: boolean;
}) {
  void _providerId;
  if (discovery) {
    return <DiscoveryPortrait name={name} />;
  }
  return <Avatar name={name} large />;
}

function DiscoveryPortrait({ name }: { name: string }) {
  const initials = name
    .replace(/^(?:Dr\.|د\.)\s*/i, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("");
  return (
    <figure className={expressive.portrait} aria-hidden="true" data-discovery-portrait>
      <span className={expressive.initials} data-discovery-initials>
        {initials}
      </span>
    </figure>
  );
}

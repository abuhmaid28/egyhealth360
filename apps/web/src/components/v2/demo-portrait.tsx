import Image from "next/image";
import { useState } from "react";
import { useLocale } from "../../lib/i18n/context";
import { useApp } from "../context";
import { Avatar } from "../ui";
import styles from "./visual-recovery.module.css";
import expressive from "./patient-discovery-signature.module.css";

const portraits = new Map([
  ["mariam-hassan", "mariam"],
  ["omar-khaled", "omar"],
  ["sara-adel", "sara"],
]);

/** Illustrative matches for the three fictional fixtures. Live names never select a portrait. */
export function ProviderPortrait({ providerId, name, discovery = false }: { providerId: string; name: string; discovery?: boolean }) {
  const { api, session } = useApp();
  const { locale } = useLocale();
  const portrait = api.mode === "demo" && session.mode === "demo" && portraits.get(providerId);
  if (discovery && api.mode === "demo" && session.mode === "demo") {
    return <DiscoveryPortrait key={providerId} portrait={portrait || undefined} name={name} />;
  }
  if (!portrait) return <Avatar name={name} large />;
  return (
    <figure className={styles.portrait}>
      <Image src={`/visual-recovery/${portrait}.webp`} alt="" width={448} height={448} unoptimized />
      <figcaption>{locale === "ar" ? "صورة توضيحية لشخصية تجريبية" : "Illustrative demo portrait"}</figcaption>
    </figure>
  );
}

function DiscoveryPortrait({ portrait, name }: { portrait?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.replace(/^(?:Dr\.|د\.)\s*/i, "").trim().split(/\s+/)
    .slice(0, 2).map((word) => Array.from(word)[0] ?? "").join("");
  return (
    <figure className={expressive.portrait} aria-hidden="true" data-discovery-portrait>
      {portrait && !failed ? (
        <Image src={`/visual-recovery/${portrait}.webp`} alt="" width={448} height={448}
          unoptimized onError={() => setFailed(true)} />
      ) : <span className={expressive.initials} data-discovery-initials>{initials}</span>}
    </figure>
  );
}

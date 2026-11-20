import Image from "next/image";
import { useLocale } from "../../lib/i18n/context";
import { useApp } from "../context";
import { Avatar } from "../ui";
import styles from "./visual-recovery.module.css";

const portraits = new Map([
  ["mariam-hassan", "mariam"],
  ["omar-khaled", "omar"],
  ["sara-adel", "sara"],
]);

/** Illustrative matches for the three fictional fixtures. Live names never select a portrait. */
export function ProviderPortrait({ providerId, name }: { providerId: string; name: string }) {
  const { api, session } = useApp();
  const { locale } = useLocale();
  const portrait = api.mode === "demo" && session.mode === "demo" && portraits.get(providerId);
  if (!portrait) return <Avatar name={name} large />;
  return (
    <figure className={styles.portrait}>
      <Image src={`/visual-recovery/${portrait}.webp`} alt="" width={448} height={448} unoptimized />
      <figcaption>{locale === "ar" ? "صورة توضيحية لشخصية تجريبية" : "Illustrative demo portrait"}</figcaption>
    </figure>
  );
}

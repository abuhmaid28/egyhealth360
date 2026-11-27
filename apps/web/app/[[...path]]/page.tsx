import { notFound } from "next/navigation";
import { Application } from "../../src/components/application";

const ASSET_EXTENSION = /\.(?:svg|webp|png|jpe?g|gif|ico|woff2?|ttf|map|txt)$/i;

export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const segments = path ?? [];
  const first = segments[0] ?? "";
  const last = segments[segments.length - 1] ?? "";
  if (
    first === "brand" ||
    first === "visual-recovery" ||
    first === "v2-foundation" ||
    ASSET_EXTENSION.test(last)
  ) {
    notFound();
  }
  const previewDemoOnly = process.env.EH_UI_PREVIEW_DEMO_ONLY === "1";
  return (
    <Application
      liveConfigured={
        process.env.EH_UI_LIVE_CONFIGURED === "1" && !previewDemoOnly
      }
    />
  );
}

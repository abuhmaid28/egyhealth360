import { Application } from "../../src/components/application";
export default function Page() {
  return (
    <Application liveConfigured={process.env.EH_UI_LIVE_CONFIGURED === "1"} />
  );
}

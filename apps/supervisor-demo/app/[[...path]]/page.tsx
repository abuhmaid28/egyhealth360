import { DemoPage } from "../../src/demo";
export const dynamicParams = false;
export function generateStaticParams() {
  return [[], ['patient'], ...['discover', 'appointments', 'history', 'record', 'summaries', 'follow-up', 'settings', 'doctors', 'medications'].map(p => ['patient', p]),
    ...Array.from({ length: 20 }, (_, i) => ['patient', 'appointments', `demo-appointment-${i + 1}`]),
    ...['schedule', 'availability', 'settings'].map(p => ['doctor', p]),
    ['doctor'], ['doctor', 'consultation', 'synthetic-visit'], ['doctor', 'consultation', 'synthetic-visit', 'documentation']].map(path => ({ path }));
}
export default function Page() { return <DemoPage />; }

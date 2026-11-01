"use client";
import Link from 'next/link';
import { useApp } from './context';
import { useLocale } from '../lib/i18n/context';
import { accountName, presentationName, visitPriority } from '../lib/presentation';
import { BookingIdentity, BookingTime, bookingLabels, useDirectoryNames } from './live-booking';
import { PatientJourney, LiveSummaryEntry } from './journey';
import { Avatar, Badge, Card, CardTitle, Heading, Icon, Resource, useResource } from './ui';

/** Independent existing own-data reads; one failed record cannot hide visit navigation. */
export function LivePatientHome() {
  const { api, session, refresh } = useApp();
  const { t } = useLocale();
  const profile = useResource(() => api.profile(), [api, refresh]);
  const visits = useResource(() => api.liveBookings!.history(), [api, refresh]);
  const names = useDirectoryNames();
  const name = profile.data ? presentationName(profile.data.displayName, t) : accountName(session, t);
  return <>
    <Heading eyebrow={t('Patient portal')} title={t('Your care, at a glance')}
      description={t('Your visits and shared care information, together.')}>
      <Link className="button secondary" href="/patient/discover"><Icon name="search" />{t('Find a doctor')}</Link>
    </Heading>
    <PatientJourney />
    <div className="live-home-grid">
      <div className="live-home-visits">
        <Resource resource={visits}>{result => {
          const rows = visitPriority(result.data);
          const next = rows[0];
          return <>
            <Card className="next-visit-card">
              <p className="eyebrow">{t('Your next step')}</p>
              {next ? <>
                <Badge tone={next.state === 'IN_CONSULTATION' ? 'blue' : 'soft'}>{t(bookingLabels[next.state])}</Badge>
                <h2>{t(next.state === 'IN_CONSULTATION' ? 'Your consultation is in progress' : next.state === 'BOOKED' ? 'Your scheduled appointment' : next.state === 'CONSULTED' ? 'Your last consultation is closed' : 'Review your recent visit')}</h2>
                <BookingIdentity booking={next} names={names} />
                <BookingTime booking={next} />
                <p className="muted">{t(next.state === 'CONSULTED' ? 'Check the summaries and follow-up instructions your clinician chose to share.' : 'Open your appointment for its current status and visit details.')}</p>
                <Link className="button primary" href={`/patient/appointments/${next.id}`}>{t('View appointment')}<Icon name="arrow" size={18} /></Link>
              </> : <>
                <h2>{t('Make room for your next visit')}</h2>
                <p className="muted">{t('Find a doctor and choose an available time. Your confirmed appointment will appear here.')}</p>
                <Link className="button primary" href="/patient/discover">{t('Book an appointment')}<Icon name="arrow" /></Link>
              </>}
            </Card>
            {rows.length > 0 && <Card>
              <CardTitle title={t('Recent appointments')} href="/patient/appointments" />
              <div className="live-booking-list">{rows.slice(0, 3).map(visit => <article className="live-booking-row" key={visit.id}>
                <div><Badge tone="soft">{t(bookingLabels[visit.state])}</Badge><BookingIdentity booking={visit} names={names} /><BookingTime booking={visit} /></div>
                <Link className="button secondary" href={`/patient/appointments/${visit.id}`}>{t('View booking')}<Icon name="arrow" size={16}/></Link>
              </article>)}</div>
            </Card>}
          </>;
        }}</Resource>
      </div>
      <div className="stack">
        <Card className="patient-identity-card"><Resource resource={profile}>{()=><><Avatar name={name} large /><div><h2><bdi>{name}</bdi></h2><p className="muted">{t('Your personal care space')}</p><Badge tone="soft">{t(accountName(session) !== session.name ? 'Synthetic demonstration account' : 'Live care account')}</Badge></div>
          <Link className="text-link" href="/patient/settings">{t('Manage your profile')}<Icon name="arrow" size={16}/></Link>
          </>}</Resource>
        </Card>
        <Card><LiveSummaryEntry /></Card>
        <Card className="care-privacy-note"><Icon name="shield"/><h3>{t('Shared with you, by your clinician')}</h3><p className="muted">{t('Only explicitly released summaries and follow-up instructions appear in your shared care. Private notes and drafts remain private.')}</p></Card>
      </div>
    </div>
  </>;
}

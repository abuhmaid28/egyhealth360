/* Static review controls only; no application imports or service calls. */
/* global document, window */
const query = new URL(window.location.href).searchParams;
const locale = query.get('lang') === 'ar' ? 'ar' : 'en';
const theme = query.get('theme') === 'light' ? 'light' : 'dark';
document.documentElement.lang = locale;
document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
document.documentElement.dataset.theme = theme;
const logo = document.getElementById('header-logo');
logo.src = `assets/compact-${locale}-${theme}.svg`;
logo.alt = locale === 'ar' ? 'إيجي هيلث 360' : 'EgyHealth 360';
const switcher = document.getElementById('locale');
switcher.href = `?lang=${locale === 'ar' ? 'en' : 'ar'}&theme=${theme}`;
switcher.lang = locale === 'ar' ? 'en' : 'ar';
switcher.dir = locale === 'ar' ? 'ltr' : 'rtl';
switcher.textContent = locale === 'ar' ? 'English' : 'العربية';

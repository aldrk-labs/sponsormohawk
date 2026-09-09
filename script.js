/* SponsorMohawk — combined form submission + visitor intelligence
   GitHub Pages client -> Google Apps Script
*/

(() => {
  'use strict';

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx-NWAUyeFeJUi6gvFO1UiZpcBOOGo_jcoykXbTeYEvz0O69uZH0DQFts9SKbd3x40T/exec';

  const CONFIG = {
    siteId: 'sponsormohawk',
    geoLookupUrl: 'https://ipapi.co/json/',
    threatLookupBase: 'https://api.ipapi.is/?q=',
    sessionTimeoutMinutes: 30,
    debug: false
  };

  const FORM_ID = 'partnerForm';
  const FORM_NOTE_ID = 'formNote';

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); }
      catch (_) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); }
      catch (_) {}
    }
  };

  function randomId(prefix) {
    const bytes = new Uint8Array(10);

    if (globalThis.crypto?.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }

    return `${prefix}_${Array.from(
      bytes,
      b => b.toString(16).padStart(2, '0')
    ).join('')}`;
  }

  const now = Date.now();

  let visitorId = storage.get('sm_visitor_id');

  if (!visitorId) {
    visitorId = randomId('v');
    storage.set('sm_visitor_id', visitorId);
  }

  let sessionId = storage.get('sm_session_id');
  const lastSeen = Number(storage.get('sm_last_seen') || 0);

  if (
    !sessionId ||
    now - lastSeen > CONFIG.sessionTimeoutMinutes * 60 * 1000
  ) {
    sessionId = randomId('s');
    storage.set('sm_session_id', sessionId);
  }

  storage.set('sm_last_seen', String(now));

  const sessionStartedAt = Number(
    sessionStorage.getItem('sm_session_started_at') || now
  );

  sessionStorage.setItem(
    'sm_session_started_at',
    String(sessionStartedAt)
  );

  const intel = {
    publicIp: '',
    city: '',
    region: '',
    country: '',
    countryName: '',
    ipTimeZone: '',
    org: '',
    companyName: '',
    asnOrg: '',
    isDatacenter: false,
    isTor: false,
    isProxy: false,
    isVpn: false,
    isAbuser: false
  };

  let formStarted = false;
  let formStartedAt = now;

  function endpointReady() {
    return (
      SCRIPT_URL.startsWith('https://script.google.com/macros/s/') &&
      SCRIPT_URL.endsWith('/exec')
    );
  }

  function deviceType() {
    const ua = navigator.userAgent || '';

    if (/tablet|ipad/i.test(ua)) return 'tablet';
    if (/mobi|android|iphone/i.test(ua)) return 'mobile';

    return 'desktop';
  }

  function networkFlags() {
    return [
      intel.isDatacenter ? 'Datacenter/hosting' : '',
      intel.isTor ? 'Tor' : '',
      intel.isProxy ? 'Proxy' : '',
      intel.isVpn ? 'VPN' : '',
      intel.isAbuser ? 'Abuse-listed' : ''
    ]
      .filter(Boolean)
      .join(', ');
  }

  function getUtmParams() {
    const params = new URLSearchParams(window.location.search);

    return {
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || ''
    };
  }

  function buildPayload(eventName, detail = '', extra = {}) {
    return {
      siteId: CONFIG.siteId,
      eventName,
      detail,

      visitorId,
      sessionId,

      clientTimestamp: new Date().toISOString(),
      pageUrl: window.location.href,
      referrer: document.referrer || 'Direct / unavailable',

      ...getUtmParams(),

      publicIp: intel.publicIp,
      ipCity: intel.city,
      ipRegion: intel.region,
      ipCountry: intel.country,
      ipCountryName: intel.countryName,
      ipTimeZone: intel.ipTimeZone,

      ipOrg: intel.org,
      ipCompany: intel.companyName,
      ipAsnOrg: intel.asnOrg,

      isDatacenter: intel.isDatacenter,
      isTor: intel.isTor,
      isProxy: intel.isProxy,
      isVpn: intel.isVpn,
      isAbuser: intel.isAbuser,
      networkFlags: networkFlags(),

      userAgent: navigator.userAgent || '',
      timeZone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      deviceType: deviceType(),
      screen: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      webdriver: Boolean(navigator.webdriver),

      elapsedSeconds: Math.max(
        0,
        Math.round((Date.now() - sessionStartedAt) / 1000)
      ),

      ...extra
    };
  }

  function transmit(payload, preferBeacon = false) {
    if (!endpointReady()) {
      console.warn(
        '[SponsorMohawk] Apps Script URL not configured.'
      );

      return Promise.resolve(false);
    }

    const body = JSON.stringify(payload);

    if (preferBeacon && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(
        SCRIPT_URL,
        new Blob(
          [body],
          { type: 'text/plain;charset=UTF-8' }
        )
      );

      return Promise.resolve(ok);
    }

    return fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8'
      },
      body
    })
      .then(() => true)
      .catch(error => {
        console.error(
          '[SponsorMohawk] Submit failed:',
          error
        );

        return false;
      });
  }

  function track(
    eventName,
    detail = '',
    extra = {},
    preferBeacon = false
  ) {
    storage.set(
      'sm_last_seen',
      String(Date.now())
    );

    return transmit(
      buildPayload(eventName, detail, extra),
      preferBeacon
    );
  }

  async function collectNetworkIntel() {
    try {
      const geoResponse = await fetch(
        CONFIG.geoLookupUrl,
        { cache: 'no-store' }
      );

      const geo = await geoResponse.json();

      intel.publicIp = geo.ip || '';
      intel.city = geo.city || '';
      intel.region = geo.region || '';
      intel.country =
        geo.country_code ||
        geo.country ||
        '';
      intel.countryName =
        geo.country_name ||
        '';
      intel.ipTimeZone =
        geo.timezone ||
        '';
      intel.org =
        geo.org ||
        '';
    } catch (_) {}

    if (!intel.publicIp) return;

    try {
      const threatResponse = await fetch(
        CONFIG.threatLookupBase +
          encodeURIComponent(intel.publicIp),
        { cache: 'no-store' }
      );

      const threat = await threatResponse.json();

      if (!threat.error) {
        intel.isDatacenter =
          threat.is_datacenter === true;

        intel.isTor =
          threat.is_tor === true;

        intel.isProxy =
          threat.is_proxy === true;

        intel.isVpn =
          threat.is_vpn === true;

        intel.isAbuser =
          threat.is_abuser === true;

        intel.companyName =
          threat.company_name || '';

        intel.asnOrg =
          threat.asn_org || '';
      }
    } catch (_) {}
  }

  function setupForm() {
    const form =
      document.getElementById(FORM_ID);

    if (!form) {
      console.warn(
        `[SponsorMohawk] Form #${FORM_ID} not found.`
      );
      return;
    }

    const formNote =
      document.getElementById(FORM_NOTE_ID);

    form.addEventListener(
      'input',
      () => {
        if (!formStarted) {
          formStarted = true;
          formStartedAt = Date.now();

          track(
            'form_started',
            'Sponsor partnership inquiry'
          );
        }
      },
      { passive: true }
    );

    form.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const data =
          new FormData(form);

        const honeypot =
          String(
            data.get('website') || ''
          ).trim();

        const formElapsedSeconds =
          Math.max(
            0,
            Math.round(
              (Date.now() - formStartedAt) / 1000
            )
          );

        if (honeypot) {
          await track(
            'honeypot_triggered',
            'Sponsor inquiry honeypot filled',
            { formElapsedSeconds }
          );

          return;
        }

        const message =
          String(
            data.get('message') || ''
          ).trim();

        const urlMatches =
          message.match(
            /https?:\/\/|www\./gi
          ) || [];

        if (urlMatches.length > 3) {
          await track(
            'form_blocked_url',
            'Message contained excessive URLs',
            { formElapsedSeconds }
          );

          if (formNote) {
            formNote.textContent =
              'Please remove excessive links and try again.';
          }

          return;
        }

        const submitButton =
          form.querySelector(
            '[type="submit"]'
          );

        const originalButtonText =
          submitButton
            ? submitButton.textContent
            : '';

        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent =
            'Sending...';
        }

        if (formNote) {
          formNote.textContent =
            'Sending your inquiry...';
        }

        const payload =
          buildPayload(
            'form_submitted',
            'Sponsor partnership inquiry',
            {
              contactName:
                String(
                  data.get('name') || ''
                ).trim(),

              contactCompany:
                String(
                  data.get('company') || ''
                ).trim(),

              contactEmail:
                String(
                  data.get('email') || ''
                ).trim(),

              contactPhone:
                String(
                  data.get('phone') || ''
                ).trim(),

              contactInterest:
                String(
                  data.get('interest') || ''
                ).trim(),

              contactMessage:
                message,

              formElapsedSeconds
            }
          );

        const sent =
          await transmit(payload);

        if (sent) {
          form.reset();
          formStarted = false;
          formStartedAt = Date.now();

          if (formNote) {
            formNote.textContent =
              'Thanks — your inquiry has been sent to Team Mohawk. We’ll be in touch.';
          }

          if (submitButton) {
            submitButton.textContent =
              'Sent';

            setTimeout(() => {
              submitButton.disabled = false;
              submitButton.textContent =
                originalButtonText;
            }, 2500);
          }
        } else {
          if (formNote) {
            formNote.textContent =
              'Something went wrong. Please try again.';
          }

          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
              originalButtonText;
          }
        }
      }
    );
  }

  document.addEventListener(
    'click',
    event => {
      const anchor =
        event.target.closest(
          'a[href]'
        );

      if (!anchor) return;

      const label =
        anchor.dataset.analyticsLabel ||
        anchor.getAttribute('aria-label') ||
        anchor.textContent.trim() ||
        anchor.href;

      track(
        'link_click',
        label,
        {},
        true
      );
    },
    true
  );

  window.addEventListener(
    'pagehide',
    () => {
      track(
        'session_exit',
        'Left page',
        {},
        true
      );
    }
  );

  async function init() {
    await collectNetworkIntel();

    await track(
      'page_view',
      'Viewed SponsorMohawk page'
    );

    setupForm();
  }

  init();
})();

// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://df13fcca7b777a79f38d870796bb5245@o4512135416774656.ingest.de.sentry.io/4512135429095504",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1,

  // Les sessions ne sont jamais enregistrées en temps normal, seulement quand une erreur survient
  replaysSessionSampleRate: 0,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  dataCollection: {
    // Pas de données utilisateur ni de corps de requêtes envoyés à Sentry (https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection)
    userInfo: false,
    httpBodies: [],
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

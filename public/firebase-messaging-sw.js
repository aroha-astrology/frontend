/* Aroha web push service worker.
 *
 * Registered by lib/web-push.ts with the Firebase web config in the query string
 * (a service worker cannot read build-time env vars). The messaging SDK shows the
 * notification itself for a message that has a `notification` payload, and opens
 * the `webpush.fcmOptions.link` the backend sets when it is clicked, so there is
 * no handler to write here.
 *
 * The compat build is pinned to the `firebase` version in package.json.
 */
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get("apiKey"),
  projectId: params.get("projectId"),
  appId: params.get("appId"),
  messagingSenderId: params.get("messagingSenderId"),
});

firebase.messaging();

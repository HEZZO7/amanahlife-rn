/**
 * Google Sign-In configuration (native, @react-native-google-signin).
 *
 * Fill these in after creating OAuth clients in Google Cloud Console:
 *   - GOOGLE_WEB_CLIENT_ID:  OAuth 2.0 client of type "Web application".
 *       This MUST be the same Client ID configured in Supabase →
 *       Authentication → Providers → Google, and it is the audience of the
 *       idToken on Android, so Supabase will accept it via signInWithIdToken.
 *   - GOOGLE_IOS_CLIENT_ID:  OAuth 2.0 client of type "iOS" (needed for the
 *       App Store build; safe to leave empty until iOS is set up).
 *
 * The Android OAuth client (type "Android") is created with the app package
 * `com.linkoranet.amanahlife` + the SHA-1 from the EAS keystore. It has no ID
 * to paste here — Google matches it automatically by package + SHA-1.
 */
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const GOOGLE_WEB_CLIENT_ID = '405525965488-rr2bgc56n81d4c13lpk7o16985rqpsbd.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = ''; // TODO: paste iOS client ID when Apple Developer account is set up

export const isGoogleConfigured = () => GOOGLE_WEB_CLIENT_ID.length > 0;

let configured = false;
export function configureGoogleSignIn() {
  if (configured || !isGoogleConfigured()) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    scopes: ['profile', 'email'],
    offlineAccess: false,
  });
  configured = true;
}

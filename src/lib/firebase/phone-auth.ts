'use client';

import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import {
  FirebaseAuthentication,
} from '@capacitor-firebase/authentication';
import { getFirebaseAuth } from './client';

type State =
  | { kind: 'web'; verifier: RecaptchaVerifier; confirmation: ConfirmationResult }
  | { kind: 'native'; verificationId: string };

let state: State | null = null;

export async function sendPhoneOTP(
  phone: string,
  recaptchaContainer: HTMLElement | null,
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const verificationId = await sendNativeOTP(phone);
    state = { kind: 'native', verificationId };
    return;
  }
  if (!recaptchaContainer) {
    throw new Error('reCAPTCHA container element is required on web');
  }
  const auth = getFirebaseAuth();
  // Always clear any existing verifier before creating a new one
  if (state?.kind === 'web') {
    try { state.verifier.clear(); } catch { /* ignore */ }
    state = null;
  }
  const verifier = new RecaptchaVerifier(auth, recaptchaContainer, { size: 'invisible' });
  const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
  state = { kind: 'web', verifier, confirmation };
}

export async function confirmPhoneOTP(code: string): Promise<{ idToken: string }> {
  if (!state) {
    throw new Error('No active OTP session. Send OTP first.');
  }
  if (state.kind === 'native') {
    await FirebaseAuthentication.confirmVerificationCode({
      verificationId: state.verificationId,
      verificationCode: code,
    });
    const { token } = await FirebaseAuthentication.getIdToken();
    if (!token) {
      throw new Error('Firebase did not return an ID token');
    }
    return { idToken: token };
  }
  const credential = await state.confirmation.confirm(code);
  const idToken = await credential.user.getIdToken();
  return { idToken };
}

export function resetPhoneAuth(): void {
  if (state?.kind === 'web') {
    try { state.verifier.clear(); } catch { /* ignore */ }
  }
  state = null;
}

async function sendNativeOTP(phone: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const handles: PluginListenerHandle[] = [];
    const cleanup = async () => {
      await Promise.all(handles.map((h) => h.remove()));
    };
    FirebaseAuthentication.addListener('phoneCodeSent', async (event) => {
      await cleanup();
      if (!event.verificationId) {
        reject(new Error('Firebase did not return a verificationId'));
        return;
      }
      resolve(event.verificationId);
    }).then((h) => handles.push(h));
    FirebaseAuthentication.addListener('phoneVerificationFailed', async (event) => {
      await cleanup();
      reject(new Error(event.message || 'Phone verification failed'));
    }).then((h) => handles.push(h));
    FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: phone }).catch(
      async (err) => {
        await cleanup();
        reject(err);
      },
    );
  });
}

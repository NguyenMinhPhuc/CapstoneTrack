'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setDoc, doc, serverTimestamp } from 'firebase/firestore'

export function initializeFirebase() {
    // Check if Firebase is already initialized
    if (!getApps().length) {
        // If not, initialize with the config object
        const app = initializeApp(firebaseConfig);
        return getSdks(app);
    }
    // If already initialized, return the existing app instance
    return getSdks(getApp());
}


export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';


// Re-exporting setDoc and other functions with a different name to avoid conflicts if needed
export { setDoc as setDocument, doc as getDocRef, serverTimestamp as getTimestamp } from 'firebase/firestore';

import {applicationDefault, cert, getApps, initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import firebaseClientConfig from '../../../firebase-applet-config.json' with {type: 'json'};
import {env} from './env.js';

function getCredential() {
  if (!env.firebaseServiceAccountJson) {
    return applicationDefault();
  }

  return cert(JSON.parse(env.firebaseServiceAccountJson));
}

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: getCredential(),
      projectId: firebaseClientConfig.projectId,
    });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app, firebaseClientConfig.firestoreDatabaseId);

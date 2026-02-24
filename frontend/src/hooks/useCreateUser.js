import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";

export const createUserIfNotExists = async (user) => {
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const fallbackName = user.displayName || user.email?.split("@")[0] || "User";

  if (!snap.exists()) {
    await setDoc(ref, {
      name: fallbackName,
      email: user.email,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
    });
  }

  const normalizedUsername = fallbackName.trim().toLowerCase();
  if (!normalizedUsername) return;

  const usernameRef = doc(db, "usernames", normalizedUsername);
  const usernameSnap = await getDoc(usernameRef);

  if (!usernameSnap.exists()) {
    await setDoc(usernameRef, {
      uid: user.uid,
      username: fallbackName,
      email: user.email,
      createdAt: serverTimestamp(),
    });
  }
};

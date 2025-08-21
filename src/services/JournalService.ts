// 📁 /src/services/journalService.ts
import { firestore } from './firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { JournalEntry } from '@data/JournalTypes';

export async function saveJournalEntry(entry: Omit<JournalEntry, 'id'>) {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not authenticated');

  const ref = doc(collection(firestore, 'users', user.uid, 'journal'));
  await setDoc(ref, { ...entry, id: ref.id });
}

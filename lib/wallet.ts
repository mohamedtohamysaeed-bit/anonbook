import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const KEY = 'anonbook_burner_pk';

/** Returns the burner account, creating one on first visit. Browser only. */
export function getBurner() {
  let pk = localStorage.getItem(KEY) as `0x${string}` | null;
  if (!pk) {
    pk = generatePrivateKey();
    localStorage.setItem(KEY, pk);
  }
  return privateKeyToAccount(pk);
}

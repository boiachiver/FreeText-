import { supabase } from "./supabase";

const DB_NAME = "freetext-e2ee";
const STORE = "identities";
const RSA_ALGORITHM: RsaHashedKeyGenParams = { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" };
const AES_ALGORITHM = { name: "AES-GCM", length: 256 } as const;

type Identity = { userId: string; publicKey: CryptoKey; privateKey: CryptoKey };
type EncryptedPayload = { ciphertext: string; iv: string; encrypted_keys: Record<string, string> };

const bytesToBase64 = (bytes: ArrayBuffer | Uint8Array) => {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < data.length; i += chunk) binary += String.fromCharCode(...data.subarray(i, i + chunk));
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "userId" });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const getStoredIdentity = async (userId: string): Promise<Identity | null> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(userId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

const storeIdentity = async (identity: Identity) => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(identity);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const exportPublicKey = async (key: CryptoKey) => bytesToBase64(await crypto.subtle.exportKey("spki", key));

export const ensureIdentity = async (userId: string) => {
  const existing = await getStoredIdentity(userId);
  if (existing) {
    await supabase.from("profiles").update({ public_key: await exportPublicKey(existing.publicKey) }).eq("id", userId);
    return existing;
  }
  const pair = await crypto.subtle.generateKey(RSA_ALGORITHM, false, ["encrypt", "decrypt"]);
  const identity = { userId, publicKey: pair.publicKey, privateKey: pair.privateKey } as Identity;
  await storeIdentity(identity);
  const publicKey = await exportPublicKey(pair.publicKey);
  const { error } = await supabase.from("profiles").update({ public_key: publicKey }).eq("id", userId);
  if (error) throw error;
  return identity;
};

const importPublicKey = (value: string) => crypto.subtle.importKey("spki", base64ToBytes(value), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);

export const encryptForConversation = async (userId: string, conversationId: string, text: string): Promise<EncryptedPayload> => {
  const identity = await ensureIdentity(userId);
  const { data: members, error: membersError } = await supabase.from("conversation_members").select("user_id").eq("conversation_id", conversationId);
  if (membersError) throw membersError;
  const ids = Array.from(new Set((members || []).map((m: any) => String(m.user_id)).concat(userId)));
  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id,public_key").in("id", ids);
  if (profilesError) throw profilesError;
  const keys = new Map((profiles || []).filter((p: any) => p.public_key).map((p: any) => [String(p.id), String(p.public_key)]));
  if (!keys.has(userId)) keys.set(userId, await exportPublicKey(identity.publicKey));
  if (keys.size !== ids.length) throw new Error("A conversation member has not finished setting up secure messaging yet.");

  const aesKey = await crypto.subtle.generateKey(AES_ALGORITHM, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);
  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);
  const encryptedKeys: Record<string, string> = {};
  for (const [memberId, publicKeyValue] of keys) {
    const publicKey = await importPublicKey(publicKeyValue);
    const wrapped = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawAesKey);
    encryptedKeys[memberId] = bytesToBase64(wrapped);
  }
  return { ciphertext: bytesToBase64(ciphertext), iv: bytesToBase64(iv), encrypted_keys: encryptedKeys };
};

export const decryptMessage = async (userId: string, payload: EncryptedPayload): Promise<string> => {
  const identity = await ensureIdentity(userId);
  const wrapped = payload.encrypted_keys?.[userId];
  if (!wrapped) throw new Error("This message was not encrypted for this device.");
  const rawAesKey = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, identity.privateKey, base64ToBytes(wrapped));
  const aesKey = await crypto.subtle.importKey("raw", rawAesKey, AES_ALGORITHM, false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(payload.iv) }, aesKey, base64ToBytes(payload.ciphertext));
  return new TextDecoder().decode(plaintext);
};

export const isEncryptedMessage = (message: any) => Boolean(message?.ciphertext && message?.iv && message?.encrypted_keys);

import { emptyData, validateData, type Data } from './model';
let database: Promise<IDBDatabase> | undefined;
function open() {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('case-note', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function load(): Promise<Data> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db.transaction('state').objectStore('state').get('main');
    request.onsuccess = () => { try { resolve(request.result ? validateData(request.result) : emptyData); } catch (error) { reject(error); } };
    request.onerror = () => reject(request.error);
  });
}
export async function save(data: Data): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('state', 'readwrite');
    transaction.objectStore('state').put(data, 'main');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

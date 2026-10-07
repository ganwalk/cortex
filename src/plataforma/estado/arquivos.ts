/*
  Armazenamento privado de arquivos da demonstração: IndexedDB do próprio navegador.
  Em produção, o servidor guarda em bucket privado e entrega um endereço temporário
  depois de conferir o vínculo da pessoa (dossiê, B3).
*/
const BANCO = "cortex-arquivos";
const LOJA = "arquivos";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

export async function guardarArquivo(chave: string, arquivo: Blob): Promise<void> {
  const db = await abrir();
  await new Promise<void>((ok, erro) => {
    const tx = db.transaction(LOJA, "readwrite");
    tx.objectStore(LOJA).put(arquivo, chave);
    tx.oncomplete = () => ok();
    tx.onerror = () => erro(tx.error);
  });
  db.close();
}

export async function lerArquivo(chave: string): Promise<Blob | undefined> {
  try {
    const db = await abrir();
    const blob = await new Promise<Blob | undefined>((ok, erro) => {
      const r = db.transaction(LOJA).objectStore(LOJA).get(chave);
      r.onsuccess = () => ok(r.result as Blob | undefined);
      r.onerror = () => erro(r.error);
    });
    db.close();
    return blob;
  } catch {
    return undefined;
  }
}

export async function limparArquivos(): Promise<void> {
  try {
    const db = await abrir();
    await new Promise<void>((ok) => {
      const tx = db.transaction(LOJA, "readwrite");
      tx.objectStore(LOJA).clear();
      tx.oncomplete = () => ok();
      tx.onerror = () => ok();
    });
    db.close();
  } catch {
    /* sem IndexedDB: nada a limpar */
  }
}

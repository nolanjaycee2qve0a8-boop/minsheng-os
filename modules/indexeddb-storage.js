window.MinshengBinaryStorage = (() => {
  const DB_NAME='minsheng_os', DB_VERSION=2, FILE_STORE='files', VERSION_STORE='fileVersions', RAW_STORE='rawPayloads';
  const MAX_LOCAL_FILE_SIZE=50*1024*1024;
  const supported=()=>typeof indexedDB!=='undefined';
  const open=()=>new Promise((resolve,reject)=>{
    if(!supported()) return reject(new Error('INDEXEDDB_UNAVAILABLE'));
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(FILE_STORE))db.createObjectStore(FILE_STORE,{keyPath:'id'});if(!db.objectStoreNames.contains(VERSION_STORE))db.createObjectStore(VERSION_STORE,{keyPath:'id'});if(!db.objectStoreNames.contains(RAW_STORE))db.createObjectStore(RAW_STORE,{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error||new Error('INDEXEDDB_OPEN_FAILED'));
  });
  const request=(store,mode,action)=>open().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction(store,mode), result=action(tx.objectStore(store));result.onsuccess=()=>resolve(result.result);result.onerror=()=>reject(result.error||new Error('INDEXEDDB_REQUEST_FAILED'));tx.oncomplete=()=>db.close();tx.onerror=()=>reject(tx.error||new Error('INDEXEDDB_TRANSACTION_FAILED'));}));
  const checksum=async blob=>{try{if(!globalThis.crypto?.subtle)return null;const bytes=await blob.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}catch{return null;}};
  const get=id=>request(FILE_STORE,'readonly',store=>store.get(id));
  const list=()=>request(FILE_STORE,'readonly',store=>store.getAll());
  const remove=id=>request(FILE_STORE,'readwrite',store=>store.delete(id));
  const findByChecksum=async value=>value?(await list()).find(x=>x.checksum===value)||null:null;
  const storeFile=async(file,id)=>{
    if(file.size>MAX_LOCAL_FILE_SIZE)return {ok:false,code:'FILE_TOO_LARGE',maxSize:MAX_LOCAL_FILE_SIZE};
    if(!supported())return {ok:false,code:'METADATA_ONLY'};
    const hash=await checksum(file),duplicate=await findByChecksum(hash); if(duplicate)return {ok:false,code:'DUPLICATE_BINARY',checksum:hash,duplicate};
    const now=new Date().toISOString(),record={id,blob:file,mimeType:file.type||'application/octet-stream',fileName:file.name,size:file.size,checksum:hash,checksumAlgorithm:hash?'SHA-256':null,createdAt:now,updatedAt:now};
    await request(FILE_STORE,'readwrite',store=>store.put(record)); return {ok:true,record};
  };
  const estimate=async()=>{try{return navigator.storage?.estimate?await navigator.storage.estimate():null;}catch{return null;}};
  const putRaw=record=>request(RAW_STORE,'readwrite',store=>store.put(record)); const getRaw=id=>request(RAW_STORE,'readonly',store=>store.get(id)); const removeRaw=id=>request(RAW_STORE,'readwrite',store=>store.delete(id));
  return {DB_NAME,DB_VERSION,FILE_STORE,VERSION_STORE,RAW_STORE,MAX_LOCAL_FILE_SIZE,supported,open,get,list,remove,storeFile,checksum,findByChecksum,putRaw,getRaw,removeRaw,estimate};
})();

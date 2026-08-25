window.MinshengFileIntegrity = (() => {
  const compare=async(metadata,file)=>{const checksum=await window.MinshengBinaryStorage.checksum(file);return {fileNameMatches:metadata.fileName===file.name,sizeMatches:metadata.size===file.size,checksum,checksumMatches:!!metadata.checksum&&metadata.checksum===checksum,requiresConfirmation:!!metadata.checksum&&metadata.checksum!==checksum};};
  return {compare};
})();

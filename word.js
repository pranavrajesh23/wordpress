
// Utilities
const encoder = new TextEncoder();
function toBytes(str){ return encoder.encode(str); }
function numToLE(n, bytes){
  const a = new Uint8Array(bytes);
  for(let i=0;i<bytes;i++) a[i] = (n >>> (8*i)) & 0xFF;
  return a;
}
function concat(arrs){
  let total = 0;
  for (let a of arrs) total += a.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (let a of arrs){ out.set(a, offset); offset += a.length; }
  return out;
}

// CRC32 table
const crcTable = (function(){
  const t = new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c = n;
    for(let k=0;k<8;k++){
      if(c & 1) c = 0xEDB88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf){
  let crc = 0xFFFFFFFF;
  for(let i=0;i<buf.length;i++){
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// XML escape for Word content
function escapeXml(str){
  return str.replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&apos;');
}

// Build the minimal docx XML files
function buildDocxFiles(text){
  const nowIso = (new Date()).toISOString();
  // Build document.xml with simple paragraphs per line
  const lines = text.replace(/\r\n/g,'\n').split('\n');
  const paragraphXml = lines.map(line => {
    // preserve spaces
    const safe = escapeXml(line);
    return `<w:p><w:r><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`;
  }).join('');
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphXml}
    <w:sectPr/>
  </w:body>
</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Note</dc:title>
  <dc:creator>Notepad</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
</cp:coreProperties>`;

  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>JS Notepad (no libs)</Application>
</Properties>`;

  // Return object mapping filename -> string content
  return {
    "[Content_Types].xml": contentTypes,
    "_rels/.rels": rels,
    "word/document.xml": documentXml,
    "docProps/core.xml": core,
    "docProps/app.xml": app
  };
}

// ZIP writer that stores files (no compression)
function createZipFromFiles(fileMap){
  const files = Object.keys(fileMap);
  const localParts = []; // will contain local file headers+data
  const centralParts = []; // central dir entries
  let offset = 0;

  for(const name of files){
    const contentStr = fileMap[name];
    const data = toBytes(contentStr);
    const fname = toBytes(name);
    const crc = crc32(data);
    const size = data.length;
    const compSize = size; // stored (no compression)
    // Local file header
    const localHeader = concat([
      numToLE(0x04034b50,4),
      numToLE(20,2), // version needed
      numToLE(0,2),  // gp bit flag
      numToLE(0,2),  // compression method (0 = store)
      numToLE(0,2),  // last mod time
      numToLE(0,2),  // last mod date
      numToLE(crc,4),
      numToLE(compSize,4),
      numToLE(size,4),
      numToLE(fname.length,2),
      numToLE(0,2) // extra len
    ]);
    const localEntry = concat([localHeader, fname, data]);
    localParts.push(localEntry);

    // Central directory header (record offset of this local header)
    const centralHeader = concat([
      numToLE(0x02014b50,4),
      numToLE(20,2), // version made by
      numToLE(20,2), // version needed
      numToLE(0,2),  // gp bit
      numToLE(0,2),  // compression method
      numToLE(0,2),  // last mod time
      numToLE(0,2),  // last mod date
      numToLE(crc,4),
      numToLE(compSize,4),
      numToLE(size,4),
      numToLE(fname.length,2),
      numToLE(0,2), // extra
      numToLE(0,2), // comment
      numToLE(0,2), // disk number start
      numToLE(0,2), // internal attrs
      numToLE(0,4), // external attrs
      numToLE(offset,4) // relative offset
    ]);
    const centralEntry = concat([centralHeader, fname]);
    centralParts.push(centralEntry);

    offset += localEntry.length;
  }

  // Combine locals
  const localsCombined = concat(localParts);
  const centralCombined = concat(centralParts);
  const centralOffset = localsCombined.length;
  const centralSize = centralCombined.length;

  // End of central directory
  const eocd = concat([
    numToLE(0x06054b50,4),
    numToLE(0,2), // disk 0
    numToLE(0,2), // disk with central
    numToLE(files.length,2), // entries this disk
    numToLE(files.length,2), // total entries
    numToLE(centralSize,4),
    numToLE(centralOffset,4),
    numToLE(0,2) // comment len
  ]);

  // Final ZIP bytes
  const zipBytes = concat([localsCombined, centralCombined, eocd]);
  return new Blob([zipBytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

// Main save function
function saveAsDocx(filename, textareaValue){
  const files = buildDocxFiles(textareaValue);
  const blob = createZipFromFiles(files);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // append for reliability
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); document.body.removeChild(a); }, 150);
}

// Hook up UI
// document.getElementById('saveBtn').addEventListener('click', ()=>{
//   const text = document.getElementById('press').value || '';
//   saveAsDocx('note.docx', text);
// });

// Optional: Ctrl/Cmd + S shortcut
// document.addEventListener('keydown', function(e){
//   const key = (e.key || '').toLowerCase();
//   if((e.ctrlKey || e.metaKey) && key === 's'){
//     e.preventDefault();
//     const text = document.getElementById('press').value || '';
//     saveAsDocx('note.docx', text);
//   }
// });

      async function saveWithFileSystemAPI(defaultName, text) {
    try {
    // Show the "Save As" dialog
    const handle = await window.showSaveFilePicker({
      suggestedName: defaultName,
      types: [{
        description: 'Word Document',
        accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }
      }]
    });

    // Build docx as Blob
    const files = buildDocxFiles(text);
    const blob = createZipFromFiles(files);
    const arrayBuffer = await blob.arrayBuffer();
    // Write file
    const writable = await handle.createWritable();
    await writable.write(arrayBuffer);
    await writable.close();
    alert('Saved successfully!');
  } catch (err) {
    console.error(err);
  }
}

document.getElementById("press").addEventListener('keydown', async (e) => {
  const key = (e.key || '').toLowerCase();
  if ((e.ctrlKey || e.metaKey) && key === 's') {
    e.preventDefault();
    const text = document.getElementById('press').value || '';
    await saveWithFileSystemAPI('note.docx', text);
  }
});

//till here it is just to save as word document


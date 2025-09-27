const editor = document.getElementById('press');
// Recursively convert HTML content into Word XML runs
function parseHTMLToWordRuns(node) {
    let runs = [];

    node.childNodes.forEach(child => {
        if (child.tagName === 'BR') {
    runs.push('<w:br/>'); // Word line break
} else if (child.nodeType === Node.TEXT_NODE) {
    const lines = child.textContent.split('\n');
    lines.forEach((line, i) => {
        runs.push(`<w:r><w:t xml:space="preserve">${line}</w:t></w:r>`);
        if (i < lines.length - 1) runs.push('<w:br/>');
    });
} else if (child.nodeType === Node.ELEMENT_NODE) {
    // check styles
    let rPr = '';
    const style = child.style || {};
    if (child.tagName === 'B' || child.tagName === 'STRONG' || style.fontWeight === 'bold') rPr += '<w:b/>';
    if (child.tagName === 'I' || child.tagName === 'EM' || style.fontStyle === 'italic') rPr += '<w:i/>';
    if (child.tagName === 'U' || style.textDecoration === 'underline') rPr += '<w:u w:val="single"/>';

    const innerRuns = parseHTMLToWordRuns(child).join('');
    runs.push(`<w:r><w:rPr>${rPr}</w:rPr>${innerRuns}</w:r>`);
}

    });

    return runs;
}

// Convert the contenteditable div into Word paragraphs
function buildDocxFromHTML(htmlDiv) {
    const paragraphs = [];
    htmlDiv.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            // Wrap plain text nodes in a paragraph
            const text = node.textContent.trim();
            if (text) paragraphs.push(`<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            paragraphs.push(`<w:p>${parseHTMLToWordRuns(node).join('')}</w:p>`);
        }
    });
    return paragraphs.join('');
}


// Utilities
function toBytes(str){ return new TextEncoder().encode(str); }
function concat(arrs){
  let total = arrs.reduce((sum,a)=>sum+a.length,0);
  let out = new Uint8Array(total);
  let offset = 0;
  for(let a of arrs){ out.set(a, offset); offset += a.length; }
  return out;
}

// Minimal ZIP writer (no compression)
function createZip(files){
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    function numToLE(n, bytes){
        const a = new Uint8Array(bytes);
        for(let i=0;i<bytes;i++) a[i] = (n >>> (8*i)) & 0xFF;
        return a;
    }

    function crc32(buf){
        let crc = 0xFFFFFFFF;
        const table = (() => {
            const t = new Uint32Array(256);
            for(let n=0;n<256;n++){
                let c=n;
                for(let k=0;k<8;k++) c = (c&1) ? 0xEDB88320 ^ (c>>>1) : c>>>1;
                t[n] = c >>> 0;
            }
            return t;
        })();
        for(let i=0;i<buf.length;i++) crc = (crc>>>8) ^ table[(crc ^ buf[i]) & 0xFF];
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    for(const name in files){
        const data = toBytes(files[name]);
        const fname = toBytes(name);
        const crc = crc32(data);
        const size = data.length;
        const compSize = size;

        const localHeader = concat([
            numToLE(0x04034b50,4), numToLE(20,2), numToLE(0,2), numToLE(0,2),
            numToLE(0,2), numToLE(0,2), numToLE(crc,4), numToLE(compSize,4),
            numToLE(size,4), numToLE(fname.length,2), numToLE(0,2)
        ]);

        const localEntry = concat([localHeader, fname, data]);
        localParts.push(localEntry);

        const centralHeader = concat([
            numToLE(0x02014b50,4), numToLE(20,2), numToLE(20,2), numToLE(0,2),
            numToLE(0,2), numToLE(0,2), numToLE(0,2), numToLE(crc,4),
            numToLE(compSize,4), numToLE(size,4), numToLE(fname.length,2), numToLE(0,2),
            numToLE(0,2), numToLE(0,2), numToLE(0,2), numToLE(0,4), numToLE(offset,4)
        ]);

        centralParts.push(concat([centralHeader, fname]));
        offset += localEntry.length;
    }

    const localsCombined = concat(localParts);
    const centralCombined = concat(centralParts);
    const centralOffset = localsCombined.length;
    const centralSize = centralCombined.length;

    const eocd = concat([
        numToLE(0x06054b50,4), numToLE(0,2), numToLE(0,2),
        numToLE(Object.keys(files).length,2), numToLE(Object.keys(files).length,2),
        numToLE(centralSize,4), numToLE(centralOffset,4), numToLE(0,2)
    ]);

    return new Blob([localsCombined, centralCombined, eocd], {type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}

// Build minimal docx files
function buildDocxFiles(htmlDiv){
    const paragraphXml = buildDocxFromHTML(htmlDiv);
    return {
        "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
        "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
        "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphXml}<w:sectPr/></w:body></w:document>`
    };
}

// Save function
async function saveWord() {
    const files = buildDocxFiles(editor);
    const blob = createZip(files);

    const handle = await window.showSaveFilePicker({
        suggestedName: 'document.docx',
        types: [{ description: 'Word Document', accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] } }]
    });

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    alert('Saved successfully!');
}

// const textarea = document.getElementById('press'); 
document.getElementById("press").addEventListener('keydown', async (e) => {
  const key = (e.key || '').toLowerCase();
  if ((e.ctrlKey || e.metaKey) && key === 's') {
    e.preventDefault();
    await saveWord()
  }
});

//till here it is just to save as word document

document.getElementById('bold').addEventListener('click', () => {
  editor.focus(); 
  document.execCommand('bold', false, null);
});
document.getElementById('italic').addEventListener('click', () => {
  editor.focus(); 
  document.execCommand('italic', false, null);
}); 
document.getElementById('underline').addEventListener('click', () => {
  editor.focus(); 
  document.execCommand('underline', false, null);
}); 

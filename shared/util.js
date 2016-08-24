const pdfjs = require('pdfjs-dist/build/pdf.combined');
const Trie = require('./trie');
const pinyin = require('pinyin');

/* Set scale = -1 to auto-scale */

function renderPDF(content, scale, elem, targetWidth) {
  return pdfjs.getDocument(content).then(pdf => {
    const promises = [];
    for(let i = 1; i<=pdf.numPages; ++i) {
      promises.push(pdf.getPage(i).then(page => {
        let _scale = scale;
        if(_scale === -1) {
          const svp = page.getViewport(1)
          _scale = targetWidth / svp.width;
          console.log(_scale);
        }

        const vp = page.getViewport(_scale);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = vp.height;
        canvas.width = vp.width;

        page.render({
          canvasContext: context,
          viewport: vp,
        });

        elem.appendChild(canvas);
      }));
    }

    return Promise.all(promises);
  });
}

function getFileType(mime) {
  if(mime === 'application/pdf') return 'pdf';
  else if(mime.split('/')[0] === 'image') return 'image';
  else return 'download'
}

function _cateCmp(a, b, vote) {
  if(a.vote === vote) {
    if(b.vote === vote)
      return a.originalId < b.originalId ? -1 : 1;
    else return -1;
  } else if(b.vote === vote) return 1;

  return 0;
}

/* Sort the matrix based on the following criterias:
 * - Passed -> Positive -> Negative -> Abstained
 * - Sort based on the original iteration in each category
 */

function sortVoteMatrix(mat) {
  mat.sort((a, b) => {
    for(const v of [0, 1, -2, -1]) {
      const res = _cateCmp(a, b, v);
      if(res !== 0) return res;
    }

    return 0;
  });
}

function buildTrieTree(entries) {
  const root = new Trie();
  for(const entry of entries) {
    const segs = pinyin(entry, {
      heteronym: true,
      style: pinyin.STYLE_NORMAL,
    });

    const segTries = segs.map(seg => Trie.fromStrings(seg));
    const entryTrie = new Trie();
    segTries.reduce((leaves, seg) => {
      const res = leaves.reduce((prev, leaf) => prev.concat(seg.applyTo(leaf)), [])
      return res;
    }, [entryTrie]);

    entryTrie.forEach(node => {
      node.addEntry(entry);
    });

    entryTrie.applyTo(root);
  }

  return root;
}

function resolveAC(trie, prefix) {
  const node = trie.get(prefix);
  if(node) return [...node.getEntries()];
  else return [];
}

module.exports = {
  renderPDF,
  getFileType,
  sortVoteMatrix,
  buildTrieTree,
  resolveAC,
}

const pdfjs = require('pdfjs-dist/build/pdf.combined');

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

module.exports = {
  renderPDF
}

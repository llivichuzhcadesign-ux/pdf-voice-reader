# PDF Voice Reader PWA - GitHub Friendly

This version is easier to upload to GitHub Pages because it includes only the two PDF.js files needed for most PDFs:

- vendor/pdf.min.mjs
- vendor/pdf.worker.min.mjs

It does not include the full PDF.js `cmaps` and `standard_fonts` folders, which contain many files and can trigger GitHub's web upload limit. Most normal English/Spanish PDFs should work. Some older or CJK-font PDFs may render/extract less accurately without the full CMap/font pack.

## Upload to GitHub Pages

Upload the contents of this folder, not the folder itself, so `index.html` is at the repository root.

Then enable GitHub Pages:
Settings → Pages → Deploy from branch → main → root.

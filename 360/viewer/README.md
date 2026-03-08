360 Image Viewer

Usage

- Open `index.html` in your browser (double-click) or serve the folder with a local server.
- The viewer automatically loads the bundled file `image.jpg` from this folder — no selection required.

Notes

- For best results use an equirectangular (360) image with width ≈ 2× height (e.g., 6000×3000).
- To change the photo, replace `image.jpg` in this folder with your own file (keep the filename `image.jpg`).
- If the image appears rotated, edit the `rotation` on the `<a-sky id="sky">` element in `index.html` (for example `rotation="0 -90 0"`).

Optional: run a local server (PowerShell)

```powershell
Set-Location "c:\Users\human\Desktop\Study\UTM 4FLAT\Sem 5\PSM 1\360\viewer"
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

If you'd like, I can add mobile gyro support, zoom controls, or a compact UI — tell me which feature you want next.

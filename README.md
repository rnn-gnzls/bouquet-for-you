# A Bouquet for You — starter website

A responsive Flask website with two password-protected bouquet pages, animated illustrated flowers, a Morse-code letter, and separate background audio tracks.

## 1. Requirements
- Python 3.9+
- Flask

Install:
```bash
python -m pip install flask
```

## 2. Set your passwords

Set these environment variables before running. Use passwords you will share privately with each friend.

**macOS / Linux**
```bash
export DION_PASSWORD='your-private-dion-password'
export EUNICE_PASSWORD='your-private-eunice-password'
export FLASK_SECRET_KEY='a-long-random-secret-string'
python app.py
```

**Windows PowerShell**
```powershell
$env:DION_PASSWORD="your-private-dion-password"
$env:EUNICE_PASSWORD="your-private-eunice-password"
$env:FLASK_SECRET_KEY="a-long-random-secret-string"
python app.py
```

Then visit http://127.0.0.1:5000

Do not deploy with the sample passwords or sample Flask secret key. For a public deployment, use HTTPS, a production WSGI server, secure cookie settings, and environment variables managed by your hosting provider.

## 3. Personalize the bouquets

Open `static/app.js` and edit the `CONFIG` object:
- `quote`: each person's quote
- `morse`: message in Morse code; spaces separate letters and ` / ` separates words
- `song`: path to each person's audio file

Put your own audio files here:
- `static/audio/dion.mp3`
- `static/audio/eunice.mp3`

Use audio files you have permission to use. Autoplay with sound is subject to browser rules; the password submission is a user gesture, but some browsers may still block playback. If that happens, a visible play button can be added.

## 4. Run on a phone

For testing on the same Wi-Fi, run Flask on your computer using:
```bash
python app.py
```
Change `host="127.0.0.1"` to `host="0.0.0.0"` in `app.py`, then open `http://YOUR-COMPUTER-LAN-IP:5000` on the phone. This is only for local testing. To share it with friends remotely, deploy it to a hosting service with HTTPS.

## Notes
- The passwords are verified server-side, not stored in the page's JavaScript.
- The flower illustration is an original SVG/CSS composition. The current flower heads are tulip-inspired; the Eunice palette is blue with small lily-of-the-valley sprigs.
- The letter appears below the bouquet rather than over it, so the flowers remain visible.

import os
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "0919-2003")

PASSWORD_HASHES = {
    "dion": generate_password_hash(os.environ.get("DION_PASSWORD", "0623-2002")),
    "eunice": generate_password_hash(os.environ.get("EUNICE_PASSWORD", "1212-2005")),
}

# Fill these in. Songs go in static/songs/
CONTENT = {
    "dion": {
        "name": "dion",
        "quote": "replace me with the quote that reminds you of dion",
        "message": "replace me with dion's hidden message",
        "song": "/static/songs/dion.mp3",
    },
    "eunice": {
        "name": "eunice",
        "quote": "replace me with the quote that reminds you of eunice",
        "message": "replace me with eunice's hidden message",
        "song": "/static/songs/eunice.mp3",
    },
}

MORSE = {
    "a": ".-", "b": "-...", "c": "-.-.", "d": "-..", "e": ".", "f": "..-.", "g": "--.", "h": "....",
    "i": "..", "j": ".---", "k": "-.-", "l": ".-..", "m": "--", "n": "-.", "o": "---", "p": ".--.",
    "q": "--.-", "r": ".-.", "s": "...", "t": "-", "u": "..-", "v": "...-", "w": ".--", "x": "-..-",
    "y": "-.--", "z": "--..", "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
    "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
    ".": ".-.-.-", ",": "--..--", "?": "..--..", "!": "-.-.--", "'": ".----.",
}

def to_morse(text):
    words = []
    for word in text.lower().split():
        letters = [MORSE[c] for c in word if c in MORSE]
        if letters:
            words.append(" ".join(letters))
    return " / ".join(words)

def payload(friend):
    c = CONTENT[friend]
    return {"ok": True, "friend": friend, "name": c["name"], "quote": c["quote"],
            "song": c["song"], "morse": to_morse(c["message"])}

def bouquet_required(fn):
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if session.get("friend") not in PASSWORD_HASHES:
            return jsonify(ok=False), 401
        return fn(*args, **kwargs)
    return wrapper

@app.get("/")
def home():
    session.clear()
    return render_template("index.html")

@app.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    friend = data.get("friend", "")
    password = data.get("password", "")
    if friend not in PASSWORD_HASHES or not check_password_hash(PASSWORD_HASHES[friend], password):
        return jsonify(ok=False, message="That password doesn't match. Try again. 🌷"), 401
    session.clear()
    session["friend"] = friend
    return jsonify({**payload(friend), "redirect": url_for("bouquet", friend=friend)})

@app.get("/bouquet/<friend>")
def bouquet(friend):
    if friend not in PASSWORD_HASHES or session.get("friend") != friend:
        return redirect(url_for("home"))
    return render_template("index.html", friend=friend)

@app.get("/api/bouquet")
@bouquet_required
def api_bouquet():
    return jsonify(payload(session["friend"]))

@app.post("/logout")
def logout():
    session.clear()
    return jsonify(ok=True, redirect=url_for("home"))

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
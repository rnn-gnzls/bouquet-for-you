import os
from functools import wraps
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "0919-2003")

PASSWORD_HASHES = {
    "dion": generate_password_hash(os.environ.get("DION_PASSWORD", "0623-2002")),
    "eunice": generate_password_hash(os.environ.get("EUNICE_PASSWORD", "1212-2005")),
}

def bouquet_required(friend):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if session.get("friend") != friend:
                return redirect(url_for("home"))
            return fn(*args, **kwargs)
        return wrapper
    return decorator

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
    return jsonify(ok=True, redirect=url_for("bouquet", friend=friend))

@app.get("/bouquet/<friend>")
def bouquet(friend):
    if friend not in PASSWORD_HASHES or session.get("friend") != friend:
        return redirect(url_for("home"))
    return render_template("index.html", friend=friend)

@app.post("/logout")
def logout():
    session.clear()
    return jsonify(ok=True, redirect=url_for("home"))

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
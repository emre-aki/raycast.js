from flask import Flask, render_template, request
from datetime import datetime

app = Flask(__name__)

@app.route("/")
def index():
    addr = str(request.environ["REMOTE_ADDR"])
    if "X-Forwarded-For" in request.headers:
        addr = str(request.headers.getlist("X-Forwarded-For")[0].rpartition(' ')[-1])
    print("[INFO] <%s> %s logged in." %
        (str(datetime.now()).split(".")[0], addr))
    return render_template("index.html")

if __name__ == '__main__':
    app.run(debug=False)
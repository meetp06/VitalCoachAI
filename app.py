from flask import Flask, request, jsonify

app = Flask(__name__)

latest_data = {}

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

@app.route("/api/health/ingest", methods=["POST"])
def ingest():
    global latest_data
    latest_data = request.json
    print("Received from Nexla:", latest_data)
    return jsonify({"success": True, "message": "Data received"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
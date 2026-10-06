from flask import Flask, request, jsonify
from db import get_db_connection

app = Flask(__name__)


# --------------------------------------------------
# HOME
# --------------------------------------------------

@app.route("/")
def home():
    return "Job Recruitment Backend is Running!"


# --------------------------------------------------
# TEST DATABASE CONNECTION
# --------------------------------------------------

@app.route("/test-db")
def test_db():

    try:
        connection = get_db_connection()

        if connection.is_connected():
            connection.close()
            return "MySQL Connected Successfully!"

    except Exception as e:
        return f"Database Error: {e}"


# --------------------------------------------------
# REGISTER API
# --------------------------------------------------

@app.route("/register", methods=["POST"])
def register():

    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    if not name or not email or not password or not role:
        return jsonify({
            "message": "All fields are required"
        }), 400

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        query = """
            INSERT INTO users
            (name, email, password, role)
            VALUES (%s, %s, %s, %s)
        """

        values = (name, email, password, role)

        cursor.execute(query, values)
        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "message": "Registration successful"
        }), 201

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# --------------------------------------------------
# LOGIN API
# --------------------------------------------------

@app.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    # Check required fields
    if not email or not password:
        return jsonify({
            "message": "Email and password are required"
        }), 400

    try:
        connection = get_db_connection()

        # dictionary=True gives column names with values
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT user_id, name, email, password, role
            FROM users
            WHERE email = %s
        """

        cursor.execute(query, (email,))

        user = cursor.fetchone()

        cursor.close()
        connection.close()

        # User not found
        if user is None:
            return jsonify({
                "message": "Invalid email or password"
            }), 401

        # Password check
        if user["password"] != password:
            return jsonify({
                "message": "Invalid email or password"
            }), 401

        # Login successful
        return jsonify({
            "message": "Login successful",
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# --------------------------------------------------
# RUN FLASK SERVER
# --------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True)
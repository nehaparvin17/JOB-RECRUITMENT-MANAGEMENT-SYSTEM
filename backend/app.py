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
# CREATE JOB API
# --------------------------------------------------

@app.route("/jobs", methods=["POST"])
def create_job():

    data = request.get_json()

    recruiter_id = data.get("recruiter_id")
    title = data.get("title")
    company = data.get("company")
    location = data.get("location")
    salary = data.get("salary")
    description = data.get("description")
    skills = data.get("skills")

    # Check required fields
    if not recruiter_id or not title or not company or not location:
        return jsonify({
            "message": "Recruiter ID, title, company and location are required"
        }), 400

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        query = """
            INSERT INTO jobs
            (recruiter_id, title, company, location, salary, description, skills)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """

        values = (
            recruiter_id,
            title,
            company,
            location,
            salary,
            description,
            skills
        )

        cursor.execute(query, values)
        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "message": "Job posted successfully"
        }), 201

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    # --------------------------------------------------
# GET ALL JOBS API
# --------------------------------------------------

@app.route("/jobs", methods=["GET"])
def get_jobs():

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT
                job_id,
                recruiter_id,
                title,
                company,
                location,
                salary,
                description,
                skills,
                created_at
            FROM jobs
            ORDER BY created_at DESC
        """

        cursor.execute(query)

        jobs = cursor.fetchall()

        cursor.close()
        connection.close()

        return jsonify({
            "jobs": jobs
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

    # --------------------------------------------------
# APPLY FOR JOB API
# --------------------------------------------------

@app.route("/applications", methods=["POST"])
def apply_for_job():

    data = request.get_json()

    job_id = data.get("job_id")
    candidate_id = data.get("candidate_id")

    # Check required fields
    if not job_id or not candidate_id:
        return jsonify({
            "message": "Job ID and candidate ID are required"
        }), 400

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        # Check whether job exists
        check_job_query = """
            SELECT job_id
            FROM jobs
            WHERE job_id = %s
        """

        cursor.execute(check_job_query, (job_id,))
        job = cursor.fetchone()

        if job is None:
            cursor.close()
            connection.close()

            return jsonify({
                "message": "Job not found"
            }), 404

        # Insert application
        query = """
            INSERT INTO applications
            (job_id, candidate_id, status)
            VALUES (%s, %s, %s)
        """

        values = (job_id, candidate_id, "Applied")

        cursor.execute(query, values)
        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "message": "Application submitted successfully"
        }), 201

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    # --------------------------------------------------
# GET CANDIDATE APPLICATIONS API
# --------------------------------------------------

@app.route("/applications/<int:candidate_id>", methods=["GET"])
def get_candidate_applications(candidate_id):

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT
                a.application_id,
                a.job_id,
                j.title,
                j.company,
                j.location,
                j.salary,
                a.status,
                a.applied_at
            FROM applications a
            JOIN jobs j
                ON a.job_id = j.job_id
            WHERE a.candidate_id = %s
            ORDER BY a.applied_at DESC
        """

        cursor.execute(query, (candidate_id,))

        applications = cursor.fetchall()

        cursor.close()
        connection.close()

        return jsonify({
            "applications": applications
        }), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    # --------------------------------------------------
# GET RECRUITER APPLICATIONS API
# --------------------------------------------------

@app.route("/recruiter/applications/<int:recruiter_id>", methods=["GET"])
def get_recruiter_applications(recruiter_id):

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT
                a.application_id,
                u.name AS candidate_name,
                u.email AS candidate_email,
                j.job_id,
                j.title AS job_title,
                j.company,
                a.status,
                a.applied_at
            FROM applications a
            JOIN users u
                ON a.candidate_id = u.user_id
            JOIN jobs j
                ON a.job_id = j.job_id
            WHERE j.recruiter_id = %s
            ORDER BY a.applied_at DESC
        """

        cursor.execute(query, (recruiter_id,))

        applications = cursor.fetchall()

        cursor.close()
        connection.close()

        return jsonify({
            "applications": applications
        }), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

        # --------------------------------------------------
# UPDATE APPLICATION STATUS API
# --------------------------------------------------

@app.route("/applications/<int:application_id>/status", methods=["PUT"])
def update_application_status(application_id):

    data = request.get_json()

    status = data.get("status")

    # Check required field
    if not status:
        return jsonify({
            "message": "Status is required"
        }), 400

    # Allowed statuses
    allowed_statuses = [
        "Applied",
        "Shortlisted",
        "Rejected",
        "Selected"
    ]

    if status not in allowed_statuses:
        return jsonify({
            "message": "Invalid status",
            "allowed_statuses": allowed_statuses
        }), 400

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        # Check whether application exists
        check_query = """
            SELECT application_id
            FROM applications
            WHERE application_id = %s
        """

        cursor.execute(check_query, (application_id,))
        application = cursor.fetchone()

        if application is None:
            cursor.close()
            connection.close()

            return jsonify({
                "message": "Application not found"
            }), 404

        # Update status
        update_query = """
            UPDATE applications
            SET status = %s
            WHERE application_id = %s
        """

        cursor.execute(
            update_query,
            (status, application_id)
        )

        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "message": "Application status updated successfully",
            "application_id": application_id,
            "status": status
        }), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

        # --------------------------------------------------
# GET RECRUITER'S OWN JOBS API
# --------------------------------------------------

@app.route("/recruiter/jobs/<int:recruiter_id>", methods=["GET"])
def get_recruiter_jobs(recruiter_id):

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT
                job_id,
                recruiter_id,
                title,
                company,
                location,
                salary,
                description,
                skills,
                created_at
            FROM jobs
            WHERE recruiter_id = %s
            ORDER BY created_at DESC
        """

        cursor.execute(query, (recruiter_id,))

        jobs = cursor.fetchall()

        cursor.close()
        connection.close()

        return jsonify({
            "jobs": jobs
        }), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    # --------------------------------------------------
# UPDATE JOB API
# --------------------------------------------------

@app.route("/jobs/<int:job_id>", methods=["PUT"])
def update_job(job_id):

    data = request.get_json()

    title = data.get("title")
    company = data.get("company")
    location = data.get("location")
    salary = data.get("salary")
    description = data.get("description")
    skills = data.get("skills")

    # Check required fields
    if not title or not company or not location:
        return jsonify({
            "message": "Title, company and location are required"
        }), 400

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        # Check whether job exists
        check_query = """
            SELECT job_id
            FROM jobs
            WHERE job_id = %s
        """

        cursor.execute(check_query, (job_id,))
        job = cursor.fetchone()

        if job is None:
            cursor.close()
            connection.close()

            return jsonify({
                "message": "Job not found"
            }), 404

        # Update job
        update_query = """
            UPDATE jobs
            SET
                title = %s,
                company = %s,
                location = %s,
                salary = %s,
                description = %s,
                skills = %s
            WHERE job_id = %s
        """

        values = (
            title,
            company,
            location,
            salary,
            description,
            skills,
            job_id
        )

        cursor.execute(update_query, values)
        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "message": "Job updated successfully",
            "job_id": job_id
        }), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

        # --------------------------------------------------
# DELETE JOB API
# --------------------------------------------------

@app.route("/jobs/<int:job_id>", methods=["DELETE"])
def delete_job(job_id):

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        # Check whether job exists
        check_query = """
            SELECT job_id
            FROM jobs
            WHERE job_id = %s
        """

        cursor.execute(check_query, (job_id,))
        job = cursor.fetchone()

        if job is None:
            cursor.close()
            connection.close()

            return jsonify({
                "message": "Job not found"
            }), 404

        # Delete job
        delete_query = """
            DELETE FROM jobs
            WHERE job_id = %s
        """

        cursor.execute(delete_query, (job_id,))
        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "message": "Job deleted successfully",
            "job_id": job_id
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
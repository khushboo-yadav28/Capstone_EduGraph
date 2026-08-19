# 🎓 EduGraph API (Backend)

EduGraph is a **Knowledge-Graph-based Learning Management System (LMS)** powered by **FastAPI**, **PostgreSQL with pgvector**, and **Google Gemini AI**.

It automatically parses course materials, generates structured **Directed Acyclic Graphs (DAGs)** for topics, dynamically tracks student progress, and provides **context-aware AI doubt resolution**.

## 🛠️ Tech Stack

* **Framework:** FastAPI (Python 3.10+)
* **ASGI Server:** Uvicorn
* **Database & ORM:** PostgreSQL, SQLAlchemy, `pgvector`
* **AI & Graph Engine:** Google Gemini API (`google-genai`), NetworkX, PyMuPDF, YouTube Transcript API
* **Security & Authentication:** JWT (JSON Web Tokens), `pwdlib` (bcrypt)

## 🚀 Quickstart Guide (Local Setup)

Follow these steps to set up and run the backend locally on your machine.

### 1. Prerequisites

Ensure you have the following installed:

* **Python 3.10+**
* **PostgreSQL Server** running locally on port `5432`
* **pgvector** PostgreSQL extension
* **Google Gemini API Key**
* **Git**

### 2. Environment Setup & Configuration

#### 1. Navigate to the backend directory

```bash
cd backend
```

#### 2. Create and activate a virtual environment

**Linux/macOS:**

```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows:**

```bash
python -m venv venv
venv\Scripts\activate
```

#### 3. Install Dependencies

Upgrade `pip` and install the required Python packages:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 4. Configure Environment Variables

Create a `.env` file inside the `backend/` directory and add the following configuration:

```env
# App Configuration
PROJECT_NAME="EduGraph API"
ENVIRONMENT="development"
PORT=8000

# Database Settings
# Update username, password, and port according to your local PostgreSQL setup
DATABASE_URL="postgresql://postgres:password@localhost:5432/edugraph_db"

# Gemini API Credentials
GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"
GEMINI_PRIMARY_MODEL="gemini-3.5-flash"
GEMINI_FALLBACK_MODEL="gemini-3.0-flash"

GEMINI_INGESTION_TEMPERATURE=0.2
GEMINI_INGESTION_MAX_TOKENS=16384

GEMINI_CHAT_TEMPERATURE=0.7
GEMINI_CHAT_MAX_TOKENS=1500

RESPONSE_MIME_TYPE="application/json"

# Security & Authentication
SECRET_KEY="replace_this_with_a_secure_random_string"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

> **Note:** Never commit your `.env` file or expose your Gemini API key or `SECRET_KEY` publicly.

### 3. Database Initialization & Seeding

#### 1. Create the Database

Make sure PostgreSQL is running, then create the `edugraph_db` database using PostgreSQL, `psql`, or pgAdmin.

```sql
CREATE DATABASE edugraph_db;
```

#### 2. Enable pgvector

Connect to the `edugraph_db` database and enable the `vector` extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 3. Run Database Migrations

Alternatively, if the project is configured for direct SQLAlchemy table creation, uncomment the following in `app/main.py`:

```python
Base.metadata.create_all(bind=engine)
```

#### 4. Seed Initial Data

Run the seed script to populate default categories and test accounts:

```bash
python seed.py
```

### 4. Running the Development Server

Start the FastAPI application using Uvicorn:

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at:

```text
http://localhost:8000
```

## 🔑 Default Seeded Credentials

After running `python seed.py`, the following test accounts are created:

| **Role**       | **Email**              | **Password**    | **Access Rights**                              |
| -------------- | ---------------------- | --------------- | ---------------------------------------------- |
| **Admin**      | `admin@edugraph.com`   | `admin123`      | System management and base data seeding        |
| **Instructor** | `instructor@gmail.com` | `instructor123` | Upload material, generate and publish courses  |
| **Student**    | `student@gmail.com`    | `student123`    | Enroll in courses, take quizzes, ask AI doubts |

> **Warning:** These credentials are intended for local development/testing only. Change them before deploying the application to production.

## 📑 Interactive API Documentation

Once the backend server is running, FastAPI automatically provides interactive API documentation.

* **Swagger UI:** `http://localhost:8000/docs`
* **ReDoc:** `http://localhost:8000/redoc`
* **Health Check:** `http://localhost:8000/health`

### Swagger UI

Swagger UI allows you to:

* Explore available API endpoints
* View request and response schemas
* Test API endpoints directly
* Authenticate using JWT tokens
* Inspect API responses

## 🧠 Core Features

### 📚 Course Material Processing

* Upload and process learning materials
* Extract text from PDF documents using **PyMuPDF**
* Retrieve transcripts from YouTube learning resources
* Process educational content using Gemini AI

### 🕸️ Knowledge Graph Generation

* Extract topics and concepts from course materials
* Identify relationships between concepts
* Generate structured topic graphs
* Represent learning dependencies using **Directed Acyclic Graphs (DAGs)**
* Use **NetworkX** for graph processing

### 📈 Student Progress Tracking

* Track course enrollment
* Track topic-level learning progress
* Record quiz performance
* Dynamically determine learning progress based on completed topics

### 🤖 AI Doubt Resolution

* Context-aware AI question answering
* Uses course/topic context to generate relevant responses
* Gemini-powered explanations
* Supports student questions related to enrolled learning material

### 🔐 Authentication & Authorization

* JWT-based authentication
* Password hashing using `pwdlib` with bcrypt
* Role-based access for:

  * Admin
  * Instructor
  * Student

## 📂 Backend Directory Structure

```text
backend/
├── app/
│   ├── api/
│   │   ├── auth.py              # Authentication APIs (login, register)
│   │   ├── courses.py           # Course management & graph APIs
│   │   ├── enrollment.py        # Enrollment & student progress APIs
│   │   └── quiz.py              # Quiz fetching, submission & scoring APIs
│   │
│   ├── core/
│   │   ├── config.py            # Application configuration & env settings
│   │   └── security.py          # JWT token generation & password hashing
│   │
│   ├── models/
│   │   ├── user.py              # User ORM database model
│   │   ├── course.py            # Course, Node, Edge, Enrollment, Badge models
│   │   └── quiz.py              # Quiz, StudentProgress, QuizAttempt models
│   │
│   ├── schemas/
│   │   ├── auth.py              # Login, registration & token schemas
│   │   ├── course.py            # Course CRUD schemas
│   │   ├── edge.py              # DAG edge connection schemas
│   │   ├── enrollment.py        # Enrollment & certificate schemas
│   │   ├── node.py              # Individual node metadata schemas
│   │   ├── node_graph.py        # Combined graph payload response schemas
│   │   ├── quiz.py              # Quiz question & attempt submission schemas
│   │   └── user.py              # User profile & response schemas
│   │
│   ├── services/
│   │   ├── course_service.py    # Course creation & publishing business logic
│   │   ├── enrollment_service.py# Student course enrollment & badge issuing logic
│   │   ├── gemini_service.py    # Gemini AI integration for DAG & doubt resolution
│   │   ├── node_service.py      # Graph status evaluation & node progression logic
│   │   └── seed_service.py      # Default categories & user accounts seeding logic
│   │
│   ├── database.py              # SQLAlchemy engine, session maker & base model setup
│   └── main.py                  # FastAPI application entry point & router registration
│
├── .env                         # Environment variables (DB URL, API Keys, Secret Key)
├── seed.py                      # Database initial seeding runner script
├── requirements.txt             # Python library dependencies
└── README.md                    # Project documentation & local setup instructions
```

## 🔄 Application Workflow

```text
                    ┌─────────────────────┐
                    │  Course Materials   │
                    │ PDF / YouTube etc.  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Content Extraction  │
                    │ PyMuPDF / YouTube   │
                    │ Transcript API      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Gemini AI        │
                    │ Topic Extraction &  │
                    │ Relationship Mining │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Knowledge Graph /   │
                    │ DAG Generation      │
                    │    NetworkX         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    │   + pgvector        │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
       ┌──────────────────┐       ┌──────────────────┐
       │ Student Progress │       │   AI Doubt       │
       │    Tracking      │       │   Resolution     │
       └──────────────────┘       └──────────────────┘
```

## 🗄️ Database

EduGraph uses **PostgreSQL** as its primary relational database.

The `pgvector` extension enables vector storage and similarity search, which can be used for AI-powered retrieval and context-aware responses.

### Database Requirements

```text
Database: edugraph_db
Host: localhost
Port: 5432
Extension: vector
```

## 🔒 Environment Variables

The following environment variables are required for the backend:

| **Variable**                  | **Description**                        |
| ----------------------------- | -------------------------------------- |
| `PROJECT_NAME`                | Name of the application                |
| `ENVIRONMENT`                 | Application environment                |
| `PORT`                        | Backend server port                    |
| `DATABASE_URL`                | PostgreSQL connection string           |
| `GEMINI_API_KEY`              | Google Gemini API key                  |
| `GEMINI_PRIMARY_MODEL`        | Primary Gemini model                   |
| `GEMINI_FALLBACK_MODEL`       | Fallback Gemini model                  |
| `SECRET_KEY`                  | Secret key used for JWT authentication |
| `ALGORITHM`                   | JWT signing algorithm                  |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT token expiration time              |

## 🧪 Development

For development, run the application with auto-reload enabled:

```bash
uvicorn app.main:app --reload --port 8000
```

After making changes to the code, Uvicorn automatically reloads the development server.

## ⚠️ Important Notes

* Do not commit `.env` files to Git.
* Keep API keys and JWT secret keys private.
* The seeded credentials are for development/testing purposes only.
* Ensure PostgreSQL is running before starting the FastAPI application.
* Ensure the `vector` PostgreSQL extension is enabled before using vector-related functionality.
* Run Alembic migrations whenever database schema changes are introduced.

## 📌 Project Status

**EduGraph Backend — Development**

The backend provides the core APIs, database layer, authentication, course processing, knowledge graph generation, student progress tracking, and AI-powered doubt resolution required by the EduGraph LMS.

## 👥 User Roles

### Admin

Responsible for system-level management and initial data setup.

### Instructor

Can:

* Upload course materials
* Generate course content
* Generate knowledge graphs
* Publish courses
* Manage learning content

### Student

Can:

* Register and log in
* Browse available courses
* Enroll in courses
* Track learning progress
* Attempt quizzes
* Ask AI-powered doubts
* Receive context-aware explanations

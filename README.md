# ClaimSafe

Upload your Indian insurance policy PDF. Get a plain-language breakdown of every clause that could cost you at claim time.

`Node.js` · `TypeScript` · `Python` · `FastAPI` · `React` · `PostgreSQL` · `Redis` · `BullMQ` · `Docker`

---

## 1. Services Overview

| Service | Technology | Port | Purpose |
| :--- | :--- | :--- | :--- |
| **nginx** | NGINX | 80 | Reverse proxy — single entry point |
| **api** | Node.js + Fastify | 3000 (internal) | Backend API + BullMQ worker |
| **pdf-service** | Python + FastAPI | 8000 (internal) | PDF extraction microservice |
| **frontend** | React + Vite | 5173 (internal) | React frontend |
| **postgres** | PostgreSQL 15 | 5432 (internal) | Primary database |
| **redis** | Redis 7 | 6379 (internal) | BullMQ job queue |

> [!NOTE]
> Only **nginx** is exposed to the host on port 80. All other ports are internal to the Docker network and can only be reached by other containers.

---

## 2. Prerequisites

*   Docker and Docker Compose installed.
*   A `.env` file created from `.env.example` with real credentials/configurations.
*   GCP service account key at `api/gcp-key.json` (for Cloud Storage — can be skipped in development).

---

## 3. First-Time Setup

```bash
# 1. Clone and enter project
git clone <repo-url>
cd ClaimSafe

# 2. Create env file
cp .env.example .env
# Fill in your values in .env

# 3. Build and start all services
docker compose up -d --build

# 4. Run database migrations (required on first start)
docker compose exec -T postgres psql -U claimsafe -d claimsafe < api/src/db/migrations/001_initial_schema.sql
```

---

## 4. Daily Dev Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Rebuild a specific service after code changes
docker compose up -d --build api
docker compose up -d --build pdf-service
docker compose up -d --build frontend

# Rebuild everything from scratch
docker compose down && docker compose up -d --build

# Follow logs for all services
docker compose logs -f

# Follow logs for a specific service
docker compose logs -f api
docker compose logs -f pdf-service
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis
```

---

## 5. Verification Commands (Full System Health Check)

Below is the verification reference to confirm the system's state and database schema details.

### 5.1 Service Status
Checks if all 6 containers are running.
```bash
docker compose ps
```
**Expected Output:**
```
NAME                    IMAGE                   COMMAND                  SERVICE       CREATED         STATUS         PORTS
claimsafe-api           claimsafe-api           "docker-entrypoint.s…"   api           5 minutes ago   Up 5 minutes   3000/tcp
claimsafe-frontend      claimsafe-frontend      "docker-entrypoint.s…"   frontend      5 minutes ago   Up 5 minutes   5173/tcp
claimsafe-nginx         claimsafe-nginx         "/docker-entrypoint.…"   nginx         5 minutes ago   Up 5 minutes   0.0.0.0:80->80/tcp, [::]:80->80/tcp, 0.0.0.0:443->443/tcp
claimsafe-pdf-service   claimsafe-pdf-service   "uvicorn main:app --…"   pdf-service   5 minutes ago   Up 5 minutes   8000/tcp
claimsafe-postgres      postgres:15-alpine      "docker-entrypoint.s…"   postgres      5 minutes ago   Up 5 minutes   5432/tcp
claimsafe-redis         redis:7-alpine          "docker-entrypoint.s…"   redis         5 minutes ago   Up 5 minutes   6379/tcp
```

### 5.2 PDF Service Health
Pings the internal FastAPI PDF service health endpoint.
```bash
curl http://localhost/pdf/health
```
**Expected Output:**
```json
{"status":"ok"}
```
*(Note: If Nginx routing rules are bypassed or local test mocks are running, you can also query internally: `docker compose exec api wget -qO- http://pdf-service:8000/health`)*

### 5.3 API Routes
Verifies route setups return `501 Not Implemented` as skeletons.

#### Upload route
```bash
curl -X POST http://localhost/api/upload
```
**Expected Output:**
```
HTTP/1.1 501 Not Implemented
{"status":"not_implemented"}
```

#### Status route
```bash
curl http://localhost/api/status/test-job-id
```
**Expected Output:**
```
HTTP/1.1 501 Not Implemented
{"status":"not_implemented"}
```

#### Result route
```bash
curl http://localhost/api/result/test-policy-id
```
**Expected Output:**
```
HTTP/1.1 501 Not Implemented
{"status":"not_implemented"}
```

#### Policies list route
```bash
curl http://localhost/api/policies
```
**Expected Output:**
```
HTTP/1.1 501 Not Implemented
{"status":"not_implemented"}
```

---

### 5.4 Database — Schema Verification

#### List all tables (should show 5 tables)
```bash
docker compose exec postgres psql -U claimsafe -d claimsafe -c "\dt"
```
**Expected Output:**
```
           List of relations
 Schema |       Name       | Type  |   Owner   
--------+------------------+-------+-----------
 public | analysis_results | table | claimsafe
 public | extractions      | table | claimsafe
 public | pipeline_jobs    | table | claimsafe
 public | policies         | table | claimsafe
 public | sessions         | table | claimsafe
(5 relations)
```

#### Verify sessions table columns
```bash
docker compose exec postgres psql -U claimsafe -d claimsafe -c "\d sessions"
```
**Expected Output:**
```
                                        Table "public.sessions"
   Column    |           Type           | Collation | Nullable |                Default                
-------------+--------------------------+-----------+----------+---------------------------------------
 session_id  | uuid                     |           | not null | gen_random_uuid()
 created_at  | timestamp with time zone |           |          | now()
 expires_at  | timestamp with time zone |           |          | (now() + '2 days'::interval)
Indexes:
    "sessions_pkey" PRIMARY KEY, btree (session_id)
Referenced by:
    TABLE "policies" CONSTRAINT "policies_session_id_fkey" FOREIGN KEY (session_id) REFERENCES sessions(session_id)
```

#### Verify policies table columns (check user_id is nullable)
```bash
docker compose exec postgres psql -U claimsafe -d claimsafe -c "\d policies"
```
**Expected Output:**
```
                                         Table "public.policies"
    Column     |           Type           | Collation | Nullable |         Default          
---------------+--------------------------+-----------+----------+--------------------------
 policy_id     | uuid                     |           | not null | gen_random_uuid()
 session_id    | uuid                     |           |          | 
 user_id       | uuid                     |           |          | 
 insurer       | text                     |           |          | 
 policy_type   | text                     |           |          | 
 sum_insured   | text                     |           |          | 
 premium       | text                     |           |          | 
 policy_period | text                     |           |          | 
 renewal_date  | text                     |           |          | 
 raw_pdf_path  | text                     |           |          | 
 created_at    | timestamp with time zone |           |          | now()
Indexes:
    "policies_pkey" PRIMARY KEY, btree (policy_id)
Foreign-key constraints:
    "policies_session_id_fkey" FOREIGN KEY (session_id) REFERENCES sessions(session_id)
Referenced by:
    TABLE "analysis_results" CONSTRAINT "analysis_results_policy_id_fkey" FOREIGN KEY (policy_id) REFERENCES policies(policy_id)
    TABLE "extractions" CONSTRAINT "extractions_policy_id_fkey" FOREIGN KEY (policy_id) REFERENCES policies(policy_id)
    TABLE "pipeline_jobs" CONSTRAINT "pipeline_jobs_policy_id_fkey" FOREIGN KEY (policy_id) REFERENCES policies(policy_id)
```

#### Verify pipeline_jobs table columns (check status constraint)
```bash
docker compose exec postgres psql -U claimsafe -d claimsafe -c "\d pipeline_jobs"
```
**Expected Output:**
```
                                           Table "public.pipeline_jobs"
      Column       |           Type           | Collation | Nullable |           Default            
-------------------+--------------------------+-----------+----------+------------------------------
 job_id            | uuid                     |           | not null | gen_random_uuid()
 policy_id         | uuid                     |           |          | 
 status            | text                     |           |          | 
 chunking_strategy | text                     |           |          | 
 pass0_at          | timestamp with time zone |           |          | 
 pass1_at          | timestamp with time zone |           |          | 
 pass2_at          | timestamp with time zone |           |          | 
 failed_at         | timestamp with time zone |           |          | 
 error             | text                     |           |          | 
 retry_count       | integer                  |           |          | 0
 created_at        | timestamp with time zone |           |          | now()
 updated_at        | timestamp with time zone |           |          | now()
Indexes:
    "pipeline_jobs_pkey" PRIMARY KEY, btree (job_id)
Check constraints:
    "pipeline_jobs_chunking_strategy_check" CHECK (chunking_strategy = ANY (ARRAY['section_aware'::text, 'overlapping_window'::text]))
    "pipeline_jobs_status_check" CHECK (status = ANY (ARRAY['uploaded'::text, 'extracting'::text, 'pass0_complete'::text, 'pass1_complete'::text, 'pass2_complete'::text, 'done'::text, 'failed'::text]))
Foreign-key constraints:
    "pipeline_jobs_policy_id_fkey" FOREIGN KEY (policy_id) REFERENCES policies(policy_id)
```

#### Verify extractions table columns
```bash
docker compose exec postgres psql -U claimsafe -d claimsafe -c "\d extractions"
```
**Expected Output:**
```
                                        Table "public.extractions"
    Column     |  Type   | Collation | Nullable |         Default          
---------------+---------+-----------+----------+--------------------------
 extraction_id | uuid    |           | not null | gen_random_uuid()
 policy_id     | uuid    |           |          | 
 clause_type   | text    |           |          | 
 raw_text      | text    |           |          | 
 page_number   | integer |           |          | 
 section_ref   | text    |           |          | 
Indexes:
    "extractions_pkey" PRIMARY KEY, btree (extraction_id)
Check constraints:
    "extractions_clause_type_check" CHECK (clause_type = ANY (ARRAY['exclusion'::text, 'waiting_period'::text, 'sublimit'::text, 'copayment'::text, 'coverage'::text]))
Foreign-key constraints:
    "extractions_policy_id_fkey" FOREIGN KEY (policy_id) REFERENCES policies(policy_id)
```

#### Verify analysis_results table columns (check JSONB types)
```bash
docker compose exec postgres psql -U claimsafe -d claimsafe -c "\d analysis_results"
```
**Expected Output:**
```
                                            Table "public.analysis_results"
      Column      |           Type           | Collation | Nullable |         Default          
------------------+--------------------------+-----------+----------+--------------------------
 result_id        | uuid                     |           | not null | gen_random_uuid()
 policy_id        | uuid                     |           |          | 
 risk_flags       | jsonb                    |           |          | 
 exclusions       | jsonb                    |           |          | 
 waiting_periods  | jsonb                    |           |          | 
 sublimits        | jsonb                    |           |          | 
 copayments       | jsonb                    |           |          | 
 coverage_summary | text                     |           |          | 
 claim_tips       | jsonb                    |           |          | 
 created_at       | timestamp with time zone |           |          | now()
Indexes:
    "analysis_results_pkey" PRIMARY KEY, btree (result_id)
Foreign-key constraints:
    "analysis_results_policy_id_fkey" FOREIGN KEY (policy_id) REFERENCES policies(policy_id)
```

---

### 5.5 Database — Migration Re-run (if tables missing)
Executes migration commands to populate public database tables.
```bash
# Run migrations manually
docker compose exec -T postgres psql -U claimsafe -d claimsafe < api/src/db/migrations/001_initial_schema.sql

# Confirm tables now exist
docker compose exec postgres psql -U claimsafe -d claimsafe -c "\dt"
```

### 5.6 Redis Verification
Checks connection status to the memory queue storage.
```bash
# Ping Redis
docker compose exec redis redis-cli ping
```
**Expected Output:**
```
PONG
```

```bash
# Check no stale jobs from previous runs
docker compose exec redis redis-cli keys "*"
```
**Expected Output:**
```
(empty array)
```

### 5.7 PostgreSQL Direct Connection
Initiates a shell shell direct interface connection with PostgreSQL.
```bash
# Connect to database shell
docker compose exec postgres psql -U claimsafe -d claimsafe

# Once inside psql — useful commands:
# \dt              list all tables
# \d <table>       describe a table
# \q               quit
```

### 5.8 TypeScript Compilation Check
Verify there are no TypeScript syntax or configuration errors in the respective directories.

```bash
# Check API compiles with no errors
cd api && npx tsc --noEmit
# Expected: (no output = success)
```

```bash
# Check frontend compiles with no errors
cd frontend && npx tsc --noEmit
# Expected: (no output = success)
```

### 5.9 Full System Check (run all at once)
```bash
# One-liner to verify the most critical pieces
docker compose ps && \
curl -s http://localhost/pdf/health && \
curl -s -o /dev/null -w "Upload route: %{http_code}\n" -X POST http://localhost/api/upload && \
docker compose exec postgres psql -U claimsafe -d claimsafe -c "\dt" && \
docker compose exec redis redis-cli ping
```

---

## 6. Resetting the Database

```bash
# Wipe all data and re-run migrations (destructive)
docker compose exec postgres psql -U claimsafe -d claimsafe -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker compose exec -T postgres psql -U claimsafe -d claimsafe < api/src/db/migrations/001_initial_schema.sql
```

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
| :--- | :--- | :--- |
| `\dt` shows no tables | Migrations not run | Run section 5.5 |
| `curl` returns connection refused | nginx not up | `docker compose up -d nginx` |
| API logs show env var error | `.env` missing a required key | Check `.env` against `.env.example` |
| pdf-service not reachable | Container not healthy | `docker compose logs pdf-service` |
| Redis ping fails | Redis container down | `docker compose up -d redis` |
| TypeScript errors on build | Code change broke types | Run compilation verification (section 5.8) |

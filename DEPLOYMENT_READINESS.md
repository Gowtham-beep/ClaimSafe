# Fly.io Deployment Readiness Audit (Pre-Deployment Verification)

This report details the readiness status of the ClaimSafe system for its migration to Fly.io.

## 1. Fixed Automatically
The following files have been modified or created to ensure local and deployment-level compatibility:
- **[frontend/src/api/client.ts](file:///home/gowtham-n/Projects/ClaimSafe/frontend/src/api/client.ts)**: Configured the frontend client to prepend the environment variable `import.meta.env.VITE_API_URL` to all API endpoints, falling back to relative URLs to preserve local development.
- **[frontend/src/vite-env.d.ts](file:///home/gowtham-n/Projects/ClaimSafe/frontend/src/vite-env.d.ts)**: Created Vite client type definitions file to resolve TypeScript compilation errors with `import.meta.env`.
- **[api/src/config.ts](file:///home/gowtham-n/Projects/ClaimSafe/api/src/config.ts)**: Removed GCS (Google Cloud Storage) dependency settings and added S3-compatible Tigris storage config keys (`tigrisEndpoint`, `tigrisAccessKeyId`, `tigrisSecretAccessKey`, `tigrisBucket`, `tigrisRegion`). Tigris environment variables are only validated if `STORAGE_DRIVER` is set to `'tigris'` or `'s3'`.
- **[api/src/storage/tigris.ts](file:///home/gowtham-n/Projects/ClaimSafe/api/src/storage/tigris.ts)**: Replaced the GCP storage provider with a new Tigris S3 storage provider using `@aws-sdk/client-s3`. Added a new `read` method to handle streaming object downloads into buffers.
- **[api/src/storage/index.ts](file:///home/gowtham-n/Projects/ClaimSafe/api/src/storage/index.ts)**: Replaced the `gcs` storage driver reference with `tigris`/`s3` and added a `read` method to the `StorageProvider` interface.
- **[api/src/pipeline/pass0.ts](file:///home/gowtham-n/Projects/ClaimSafe/api/src/pipeline/pass0.ts)**: Updated the analysis pipeline to fetch files through the storage provider abstraction (`storage.read()`) instead of reading directly from the local disk path. This resolves compatibility when files are stored in S3/Tigris rather than local volumes.
- **[api/src/queue/client.ts](file:///home/gowtham-n/Projects/ClaimSafe/api/src/queue/client.ts)**: Added TLS support (`tls: {}`) to the BullMQ Redis connection if the `REDIS_URL` uses the `rediss://` protocol (which is standard for Upstash Redis on Fly.io).
- **[api/src/db/client.ts](file:///home/gowtham-n/Projects/ClaimSafe/api/src/db/client.ts)**: Added TLS connection options to the PostgreSQL connection pool if running in production mode (`ssl: { rejectUnauthorized: false }`), which is mandatory for Fly.io's managed Postgres.
- **[api/src/db/migrate.ts](file:///home/gowtham-n/Projects/ClaimSafe/api/src/db/migrate.ts)**: Created a standalone database migration runner script that parses SQL files in `api/src/db/migrations` and executes them. It dynamically handles the file path resolution in development and production Docker image structures.
- **[api/package.json](file:///home/gowtham-n/Projects/ClaimSafe/api/package.json)**: Added `@aws-sdk/client-s3` dependency, removed `@google-cloud/storage`, and added the `migrate` execution script.
- **[api/Dockerfile](file:///home/gowtham-n/Projects/ClaimSafe/api/Dockerfile)**: Replaced dev-mode execution with compiled production execution (`npm run build` step and `CMD ["npm", "start"]`).
- **[pdf-service/main.py](file:///home/gowtham-n/Projects/ClaimSafe/pdf-service/main.py)**: Added a Python execution block to run Uvicorn programmatically, binding to `0.0.0.0` and reading the `PORT` dynamically from the environment. Enabled `--reload` only if `NODE_ENV` is set to `'development'`.
- **[pdf-service/core/config.py](file:///home/gowtham-n/Projects/ClaimSafe/pdf-service/core/config.py)**: Removed unused GCP storage config options.
- **[pdf-service/Dockerfile](file:///home/gowtham-n/Projects/ClaimSafe/pdf-service/Dockerfile)**: Changed the start command to `python main.py` to utilize the dynamic port binding and disable hot reloading in production.
- **[docker-compose.yml](file:///home/gowtham-n/Projects/ClaimSafe/docker-compose.yml)**: Overrode the execution commands for development (`command: npm run dev` for the `api` container and `PORT=8000` override for the `pdf-service` container) to ensure local dev functionality remains completely unchanged.

## 2. Needs Gowtham's Decision
| Item | Tradeoff / Explanation | Recommendation |
| :--- | :--- | :--- |
| **PDF Service RAM Constraints** | The Python PDF extraction service uses `pdfplumber`, which builds complex in-memory structures to parse PDFs. Fly.io's free tier has a 512MB RAM constraint. Large PDF policy documents (e.g., >30 pages, or heavily scanned/complex tables) can cause the service to run out of memory (OOM) and crash. | **Limit file sizes** (e.g. `MAX_FILE_SIZE_MB=10`) or accept that complex PDFs may fail as a v1 limitation. Alternatively, upgrade the Fly instance to `shared-cpu-1x` with `1GB` RAM ($3.19/mo) if this occurs in testing. |
| **BullMQ Worker Scaling** | Currently, the BullMQ queue worker is imported and runs directly inside the main `claimsafe-api` process. On Fly, this means both the REST API and the queue workers execute in the same VM instance. | **Keep them in the same VM** for now. For a low-traffic portfolio project, running in the same process is ideal because it avoids paying for a separate VM. If queue workloads become bottlenecked later, the worker can be easily decoupled into its own Fly app (`claimsafe-worker`). |
| **CORS Configuration (Post-Deploy)** | In [api/src/plugins/cors.ts](file:///home/gowtham-n/Projects/ClaimSafe/api/src/plugins/cors.ts), the CORS origin is currently set to wildcard `*`. In production, this should ideally be restricted to the exact frontend host URL once deployed. | **Restructure the CORS config post-deployment** to read from a new `FRONTEND_URL` environment variable to secure the backend API. |

## 3. Full Environment Variable List
The following table maps the environment variables across all services for Fly.io deployment:

| Variable | Service | Current Source | Required Fly Destination | Description / Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | `api` | Local `.env` | Fly Secret (Auto-injected) | Connection string for PostgreSQL database. Set automatically by Fly when attaching Postgres. |
| `REDIS_URL` | `api` | Local `.env` | Fly Secret (Auto-injected) | Connection string for Upstash Redis. Set automatically when attaching Upstash. |
| `GROQ_API_KEY` | `api` | Local `.env` | Fly Secret | API Key for the Groq LLM service. |
| `GEMINI_API_KEY` | `api` | Local `.env` | Fly Secret | API Key for the Google Gemini LLM service. |
| `PDF_SERVICE_URL` | `api` | Local `.env` | Fly App Env Var | The internal 6PN DNS address for the PDF service (`http://claimsafe-pdf.internal:8000` or via `.flycast`). |
| `NODE_ENV` | `api`, `pdf-service` | Local `.env` | Fly App Env Var | Set to `production` in deployment to disable dev tools and hot-reloading. |
| `PORT` | `api`, `pdf-service` | Local `.env` | Fly App Env Var (Dynamic) | The port the container exposes (e.g. `3000` for api, `8000` for pdf). Injected dynamically by Fly. |
| `SESSION_SECRET` | `api` | Local `.env` | Fly Secret | Secret string used for cookie session signing. |
| `PDF_TTL_HOURS` | `api` | Local `.env` | Fly App Env Var | Lifetime of extracted PDF cache (default `48` hours). |
| `STORAGE_DRIVER` | `api` | Local `.env` | Fly App Env Var | Set to `tigris` (or `s3`) for production deployment. |
| `AWS_ENDPOINT_URL_S3` | `api` | N/A | Fly Secret (Auto-injected) | Tigris S3 endpoint injected automatically by Fly's Tigris integration. |
| `AWS_ACCESS_KEY_ID` | `api` | N/A | Fly Secret (Auto-injected) | S3 Access Key ID injected automatically by Fly's Tigris integration. |
| `AWS_SECRET_ACCESS_KEY`| `api` | N/A | Fly Secret (Auto-injected) | S3 Secret Access Key injected automatically by Fly's Tigris integration. |
| `BUCKET_NAME` | `api` | N/A | Fly App Env Var (Auto-injected)| Tigris bucket name injected automatically by Fly. |
| `AWS_REGION` | `api` | N/A | Fly App Env Var | Set to `auto` for Tigris S3. |
| `MAX_FILE_SIZE_MB` | `api`, `pdf-service` | Local `.env` | Fly App Env Var | Max allowed uploaded file size (default `20`). |
| `VITE_API_URL` | `frontend` | N/A | Build-time Env Var | The public HTTP URL of the deployed `claimsafe-api` gateway (e.g. `https://claimsafe-api.fly.dev`). |

## 4. Blocking Issues
There are no remaining blocking codebase issues! The pipeline and configuration changes resolve all infrastructure incompatibilities.
However, during deployment, the following manual setup commands **must** be executed:
1. **Provision database & redis**: Make sure Fly Postgres and Upstash Redis are attached to the API app so `DATABASE_URL` and `REDIS_URL` are auto-injected.
2. **Provision Tigris storage**: Link Tigris to the API app so S3 credentials (`AWS_ACCESS_KEY_ID` etc.) are auto-injected.
3. **Database Migrations**: Set the `release_command` in the api `fly.toml` to:
   ```toml
   [deploy]
     release_command = "node dist/db/migrate.js"
   ```
   This ensures migrations run automatically on every deployment.

## 5. Verified Safe
- **Docker Compose Dev Mode**: Tested and verified that local development still starts successfully with hot-reloading (via `docker compose up -d`).
- **Static Assets Compilation**: Verified that the frontend successfully compiles a production static bundle.
- **Fastify API Compilation**: Verified that the TypeScript API service compiles cleanly into JavaScript with no errors.
- **Health Checks**: Confirmed `pdf-service` and `api` both expose `/health` returning `{"status":"ok"}`.

# ClaimSafe

ClaimSafe is a multi-service web application designed to help Indian users upload insurance policy PDFs and receive plain-language breakdowns of risks, exclusions, sub-limits, waiting periods, and copayments.

## Repository Structure

The project has a containerized multi-service architecture:

*   **`api/`**: Node.js + TypeScript + Fastify backend. Handles routing, job state management, BullMQ queue/worker interaction, LLM provider dispatching, and interaction with PostgreSQL/GCP.
*   **`pdf-service/`**: Python + FastAPI + pdfplumber microservice. Extract text, tables, and sections from policy documents.
*   **`frontend/`**: React + TypeScript + Tailwind + Vite client.
*   **`nginx/`**: Reverse proxy routing requests to frontend and api services.

## Getting Started

### Prerequisites

*   Docker and Docker Compose installed.

### Setup

1.  Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
2.  Add appropriate credentials (e.g. `GROQ_API_KEY`, `GEMINI_API_KEY`, etc.) inside the `.env` file if desired, or run with defaults for the mock skeletons.
3.  Build and run the entire multi-service setup:
    ```bash
    docker-compose up --build
    ```

### Ports
*   **Nginx Entrypoint**: `http://localhost` (proxying to Frontend at `/*` and API at `/api/*`)
*   **API**: `http://localhost:3000` (internal and proxied)
*   **PDF Service**: `http://pdf-service:8000` (internal to container network only)

# Architecture Decision Record (ADR)

## Architecture Overview
ClaimSafe utilizes a three-pass LLM pipeline (chunking/classify → structured extraction → risk interpretation) powered by asynchronous processing via BullMQ. The system follows a multi-service pattern: a Node.js Fastify API manages the state machine, while a Python microservice handles heavy-duty PDF text and table extraction.

## Key Architecture Decisions & Trade-offs

| Decision | Reasoning | Trade-off Accepted |
| :--- | :--- | :--- |
| **Three-pass LLM pipeline** | Separating extraction from interpretation prevents the model from blending mechanical extraction with judgment, improving accuracy on both. | More LLM calls per document, higher latency per analysis. |
| **Section-aware chunking with overlapping-window fallback** | Indian insurance PDFs vary wildly in structure; section detection preserves context, overlap prevents clause loss at chunk boundaries. | Adds deduplication complexity in the pipeline. |
| **Groq (LLaMA 3.3 70B) + Gemini 1.5 Flash instead of paid models** | Zero-cost constraint for a self-funded portfolio project. Pass 1 explicitly uses Gemini for its 1M context window, while Passes 0 & 2 use Groq for faster reasoning. | Lower ceiling on reasoning quality vs. Claude/GPT-4 class models; mitigated by the `LLMProvider` abstraction allowing a future swap with no pipeline changes. |
| **In-memory PDF processing, zero persistence** | Strongest possible privacy story; avoids building/maintaining a storage and retention layer for a project with no real users. | No ability to re-run analysis without re-uploading; no audit trail of the original document. |
| **BullMQ + Redis for async processing** | A 60-second analysis time is incompatible with a synchronous HTTP request; production-grade pattern. | Adds operational complexity (queue, worker, job state) vs. a simpler synchronous endpoint. |
| **Pipeline state machine persisted in PostgreSQL, not just Redis** | Enables retrying a failed pipeline from its last successful stage instead of from scratch. | Extra schema and write overhead per job. |
| **Python microservice for PDF extraction instead of a Node PDF library** | `pdfplumber` meaningfully outperforms Node alternatives on table extraction, which matters for sub-limit and waiting-period tables. | Introduces a second language/runtime into an otherwise all-TypeScript stack. |
| **Not deployed to production** | Project is an architecture and engineering demonstration, not a live product with real users. | No live demo link; mitigated by complete local run instructions and this documentation. |

## Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend API** | Node.js + Fastify (TypeScript) | Core orchestration, job queuing, state machine |
| **PDF Extraction** | Python + FastAPI + pdfplumber | Dedicated service for parsing PDFs and tables |
| **LLM Providers** | Groq (LLaMA 3.3 70B) & Google Gemini (1.5 Flash) | AI pipeline processing |
| **Queue / Workers** | BullMQ + Redis | Asynchronous job execution |
| **Database** | PostgreSQL | Persisting pipeline state and extracted results |
| **Frontend** | React + Vite + TailwindCSS | User interface |
| **Storage** | None (In-Memory Only) | Strict privacy guarantee |
| **Containerization**| Docker & Docker Compose | Multi-container local orchestration |
| **Logging** | Pino | Structured JSON logging |

## System Flow

1. **Upload**: User submits a PDF via the React frontend.
2. **In-Memory Extraction**: The Fastify API synchronously forwards the memory buffer to the Python PDF microservice, which extracts text and tables, then returns chunked data. The PDF buffer is immediately discarded.
3. **Queueing**: The API creates a job in PostgreSQL and queues it via BullMQ, returning a `job_id` to the frontend.
4. **Processing (Pass 0-2)**: The BullMQ worker processes the job asynchronously through the three-pass LLM pipeline using Groq and Gemini.
5. **Results**: The frontend polls for completion and displays the structured breakdown and risk flags.

## What This Project Demonstrates
ClaimSafe serves as a concrete example of designing an AI-native application with a focus on robust data engineering. It highlights the use of an asynchronous job architecture, a multi-service ownership model separating compute-heavy text parsing from API orchestration, and production-thinking principles like structured logging, state machines, and retryability. Every architectural decision in this system — including the decision not to deploy it — was made deliberately.

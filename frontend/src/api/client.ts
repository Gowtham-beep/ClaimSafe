import type { AnalysisResult, JobStatusResponse } from '../types';

type UploadResponse = {
  job_id: string;
  policy_id: string;
  session_id: string;
};

async function readError(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return typeof body?.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export async function uploadPolicy(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Upload failed. Please try again.'));
  }

  return response.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`/api/status/${encodeURIComponent(jobId)}`);

  if (!response.ok) {
    throw new Error(await readError(response, 'Unable to check processing status.'));
  }

  return response.json();
}

export async function getResult(policyId: string): Promise<AnalysisResult> {
  const response = await fetch(`/api/result/${encodeURIComponent(policyId)}`);

  if (response.status === 202) {
    throw new Error('Analysis is not complete yet.');
  }

  if (!response.ok) {
    throw new Error(await readError(response, 'Unable to load analysis result.'));
  }

  return response.json();
}

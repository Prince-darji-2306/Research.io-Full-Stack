/**
 * Shared Axios instance for all API calls.
 * Replaces inline axios.create() calls and per-request config duplication.
 *
 * API_BASE_URL is also exported for SSE fetch() calls that cannot use axios.
 */
import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://prince-2025-research-io.hf.space/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
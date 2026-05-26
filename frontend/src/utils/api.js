/**
 * Shared Axios instance for all API calls.
 * Replaces inline axios.create() calls and per-request config duplication.
 */
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
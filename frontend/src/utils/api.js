/**
 * Shared Axios instance for all API calls.
 * Replaces inline axios.create() calls and per-request config duplication.
 */
import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})
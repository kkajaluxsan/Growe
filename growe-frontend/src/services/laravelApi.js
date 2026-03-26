import axios from 'axios';

// Laravel is reserved for admin/reports/background jobs.
// This client is intentionally separate from Node APIs.
const baseURL =
  import.meta.env.VITE_LARAVEL_API_BASE_URL ||
  'http://127.0.0.1:8000/api';

const laravelApi = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default laravelApi;


// Backwards-compatible re-export.
// New code should import `nodeApi` or `laravelApi` instead.
import nodeApi, { invalidateCsrfToken, extractApiErrorMessage } from './nodeApi';

export { invalidateCsrfToken };
export { extractApiErrorMessage };
export default nodeApi;

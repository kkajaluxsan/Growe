// Backwards-compatible re-export.
// New code should import `nodeApi` or `laravelApi` instead.
import nodeApi, { invalidateCsrfToken } from './nodeApi';

export { invalidateCsrfToken };
export default nodeApi;

// Compatibility alias: `/api/assessments/personas` -> `/api/assessments/persona`
// Keep this route so existing clients/hooks don't break.

export { dynamic, GET, POST } from '../persona/route'

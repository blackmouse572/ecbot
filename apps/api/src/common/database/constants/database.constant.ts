export const DATABASE_CONNECTION_NAME = 'PrimaryConnectionDatabase';

// For a repository whose screens show who created or last changed a row.
// Not the default: it costs two LEFT JOINs to users on every read.
export const DATABASE_AUDIT_POPULATE = ['createdBy', 'updatedBy'];

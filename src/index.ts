import app from "./app.js";
import config from "./config/env.js";
import connectDatabase from "./db/database.js";
import connect from "./db/database.js";

await connectDatabase(); //Fail-fast: Initialize the database connection before application starts


// Start server
app.listen(config().PORT, () => {
    console.log(`CS Library running on http://localhost:${config().PORT}`);
    console.log(`Environment: ${config().NODE_ENV}`);
    console.log(`Google OAuth: ${config().googleClientId ? 'Configured' : 'Not configured'}`);
    console.log(`PostgreSQL: ${config().DB_URL ? 'Connected' : 'Not configured'}`);
});

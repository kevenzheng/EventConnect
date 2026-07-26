// =====================================================
// DATABASE CONNECTION
// Purpose:
// Connect Node.js application to MySQL database.
// Shared by app.js and every routes/*.js file — this is
// the ONLY place the connection is created, so app.js and
// all routers always talk to the same database.
// =====================================================
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'c237-eaint-mysql.mysql.database.azure.com',
    user: 'c237_022',
    password: 'c237022@2026!',
    database: 'c237_022_teampowerrangers',
    ssl: { rejectUnauthorized: false }
    });
db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
});

module.exports = db;

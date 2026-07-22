// =====================================================================================
// FEATURE 3 - JOB BROWSING (EMPLOYEE)
// Function: View Job Details + Employer Info
//
// Purpose:
// Lets any logged-in user view the full details of a single job posting,
// along with basic info about the employer who posted it.
//
// Application flow:
// View Detail -> GET /jobs/:id -> SELECT job by id, JOIN users for employer -> render page
// =====================================================================================

const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// =====================================================
// AUTHENTICATION CHECK (local to this feature)
// Pattern from L19: checks req.session.user, redirects to
// /login with a flash message if the user isn't logged in.
// =====================================================
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this page');
        res.redirect('/login');
    }
};

// =====================================================
// JOB DETAIL ROUTE
// Route: GET /jobs/:id
// Purpose:
// Show one job's full details, plus who posted it (employer info),
// by joining Jobs.posted_by to users.id.
// =====================================================
router.get('/:id', checkAuthenticated, (req, res) => {
    const sql = `
        SELECT Jobs.*, users.username AS employer_name, users.email AS employer_email
        FROM Jobs
        JOIN users ON Jobs.posted_by = users.id
        WHERE Jobs.id = ?
    `;

    db.query(sql, [req.params.id], (error, results) => {
        // Following the L18 pattern: log the error and send a friendly
        // response instead of throwing, so one bad query doesn't crash
        // the whole server (unlike the earlier throw-err bugs we hit).
        if (error) {
            console.error('Database query error:', error.message);
            return res.send('Error retrieving job details');
        }

        if (results.length === 0) {
            req.flash('error', 'Job not found.');
            return res.redirect('/jobs');
        }

        res.render('job-detail', {
            user: req.session.user,
            job: results[0],
            errors: req.flash('error')
        });
    });
});

module.exports = router;

// End of Feature 3 - Job Browsing ================================
// =====================================================================================
// FEATURE 3 - JOB BROWSING (EMPLOYEE)
// Function: View Job Details + Employer Info + Search + Filter + Reviews
//
// Purpose:
// Lets any logged-in user view the full details of a single job posting,
// along with basic info about the employer who posted it, search/filter
// job listings, and submit/view employer reviews.
//
// Application flow:
// View Detail -> GET /jobs/:id -> SELECT job by id, JOIN users for employer -> render page
// Search      -> GET /jobs/search -> keyword match across title/description/event/location
// Filter      -> GET /jobs/filter -> filter by location, sort by date/salary/location
// Reviews     -> GET/POST /jobs/review/:id -> submit a rating + review for the employer
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

// =====================================================================================
// JOB SEARCHING (EMPLOYEE)
// Function: Search Jobs by Keyword
// Done by Pearly
//
// Purpose:
// Lets employees quickly find relevant job postings by typing a keyword.
// This improves user experience by avoiding manual scrolling.
//
// Application flow:
// Enter keyword in search bar
// SQL query matches title/description/event/location -> render jobs.ejs with results
// =====================================================================================
router.get('/search', (req, res) => {
    const keyword = req.query.q;

    const sql = `
        SELECT jobs.*, users.username AS employer_name
        FROM jobs
        JOIN users ON jobs.posted_by = users.id
        WHERE jobs.job_title LIKE ?
           OR jobs.description LIKE ?
           OR jobs.event_name LIKE ?
           OR jobs.location LIKE ?
    `;

    db.query(sql, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`], (error, rows) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.send('Error searching jobs');
        }

        res.render('jobs', {
            jobs: rows,
            user: req.session.user,
            messages: req.flash('success'),
            errors: req.flash('error'),
            acceptedJobIds: [], // included so jobs.ejs won't crash
            location: '',
            sort: ''
        });
    });
});

// =====================================================
// FILTER JOBS ROUTE
// Route: GET /jobs/filter
// Purpose:
// Lets employees filter job postings by location or event date.
// =====================================================
router.get('/filter', (req, res) => {
    const { location, sort } = req.query;

    let sql = `
        SELECT jobs.*, users.username AS employer_name
        FROM jobs
        JOIN users ON jobs.posted_by = users.id
        WHERE 1=1
    `;
    const params = [];

    if (location) {
        sql += " AND jobs.location LIKE ?";
        params.push(`%${location}%`);
    }

    const allowedSorts = {
        event_date_asc: 'jobs.event_date ASC',
        event_date_desc: 'jobs.event_date DESC',
        salary_asc: 'jobs.salary ASC',
        salary_desc: 'jobs.salary DESC',
        location_asc: 'jobs.location ASC',
        location_desc: 'jobs.location DESC'
    };

    const orderBy = allowedSorts[sort] || 'jobs.event_date ASC';
    sql += ` ORDER BY ${orderBy}`;

    db.query(sql, params, (error, rows) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.send('Error filtering jobs');
        }

        res.render('jobs', {
            jobs: rows,
            user: req.session.user,
            messages: req.flash('success'),
            errors: req.flash('error'),
            acceptedJobIds: [],
            location,
            sort
        });
    });
});

//==================================Pearly_code_end_here===================================================
// Keven Start of Code

// =====================================================
// GET Route: Render Review Form
// (MUST BE PLACED BEFORE GET /:id so "review" isn't parsed as an :id)
// =====================================================
router.get('/review/:id', checkAuthenticated, (req, res) => {
    const jobId = req.params.id;

    const sql = `
        SELECT jobs.*, users.username AS employer_name
        FROM jobs
        JOIN users ON jobs.posted_by = users.id
        WHERE jobs.id = ?`;

    db.query(sql, [jobId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.send('Error retrieving job details');
        }
        if (results.length === 0) return res.redirect('/jobs');

        res.render('add_review', {
            job: results[0],
            user: req.session.user,
            errors: req.flash('error')
        });
    });
});

// =====================================================
// POST Route: Submit Review & Rating
// =====================================================
router.post('/review/:id', checkAuthenticated, (req, res) => {
    const jobId = req.params.id;
    const { rating, review_text } = req.body;
    const reviewerId = req.session.user.id;

    // Get the employer (posted_by) ID first
    db.query('SELECT posted_by FROM jobs WHERE id = ?', [jobId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.send('Error retrieving job details');
        }
        if (results.length === 0) return res.redirect('/jobs');

        const employerId = results[0].posted_by;

        const insertSql = `
            INSERT INTO employer_reviews (job_id, reviewer_id, employer_id, rating, review_text)
            VALUES (?, ?, ?, ?, ?)`;

        db.query(insertSql, [jobId, reviewerId, employerId, rating, review_text], (error) => {
            if (error) {
                console.error('Database query error:', error.message);
                return res.send('Error submitting review');
            }
            req.flash('success', 'Review submitted successfully!');
            res.redirect('/jobs/' + jobId);
        });
    });
});

// =====================================================
// GET Route: View Job Details, Employer Rating Avg & Reviews
// Route: GET /jobs/:id
// =====================================================
router.get('/:id', checkAuthenticated, (req, res) => {
    const jobId = req.params.id;

    const jobSql = `
        SELECT jobs.*, users.username AS employer_name, users.email AS employer_email, users.id AS employer_id
        FROM jobs
        JOIN users ON jobs.posted_by = users.id
        WHERE jobs.id = ?`;

    db.query(jobSql, [jobId], (error, jobResults) => {
        // Following the L18 pattern: log the error and send a friendly
        // response instead of throwing, so one bad query doesn't crash
        // the whole server.
        if (error) {
            console.error('Database query error:', error.message);
            return res.send('Error retrieving job details');
        }

        if (jobResults.length === 0) {
            req.flash('error', 'Job not found.');
            return res.redirect('/jobs');
        }

        const job = jobResults[0];

        // Fetch employer's review list for this job
        const reviewSql = `
            SELECT employer_reviews.*, users.username AS reviewer_name
            FROM employer_reviews
            JOIN users ON employer_reviews.reviewer_id = users.id
            WHERE employer_reviews.job_id = ?`;

        // Fetch employer's average rating across all their reviews
        const avgSql = `SELECT AVG(rating) as avg_rating FROM employer_reviews WHERE employer_id = ?`;

        db.query(reviewSql, [jobId], (error, reviewResults) => {
            if (error) {
                console.error('Database query error:', error.message);
                return res.send('Error retrieving reviews');
            }

            db.query(avgSql, [job.employer_id], (error, avgResult) => {
                if (error) {
                    console.error('Database query error:', error.message);
                    return res.send('Error retrieving employer rating');
                }

                const employerAvgRating = avgResult[0].avg_rating
                    ? parseFloat(avgResult[0].avg_rating).toFixed(1)
                    : 'No ratings yet';

                res.render('job-detail', {
                    job: job,
                    reviews: reviewResults,
                    employerAvgRating: employerAvgRating,
                    user: req.session.user,
                    errors: req.flash('error')
                });
            });
        });
    });
});
// Keven End of Code

module.exports = router;

// End of Feature 3 - Job Browsing ================================
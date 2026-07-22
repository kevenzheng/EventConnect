// =====================================================================================
// FEATURE 3 - JOB BROWSING (EMPLOYEE)
// Function: View Job Details + Employer Info
// Done by Ignatius
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
// =====================================================
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this page');
        res.redirect('/login');
    }
};

// Keven Start of Code
// GET Route: Render Review Form (MUST BE PLACED BEFORE GET /:id)
router.get('/review/:id', checkAuthenticated, (req, res) => {
    const jobId = req.params.id;

    const sql = `
        SELECT jobs.*, users.username AS employer_name 
        FROM jobs 
        JOIN users ON jobs.posted_by = users.id 
        WHERE jobs.id = ?`;

    db.query(sql, [jobId], (err, results) => {
        if (err || results.length === 0) return res.redirect('/jobs');

        res.render('add_review', {
            job: results[0],
            user: req.session.user,
            errors: req.flash('error')
        });
    });
});

// POST Route: Submit Review & Rating
router.post('/review/:id', checkAuthenticated, (req, res) => {
    const jobId = req.params.id;
    const { rating, review_text } = req.body;
    const reviewerId = req.session.user.id;

    // Get the employer (posted_by) ID first
    db.query('SELECT posted_by FROM jobs WHERE id = ?', [jobId], (err, results) => {
        if (err || results.length === 0) return res.redirect('/jobs');

        const employerId = results[0].posted_by;

        const insertSql = `
            INSERT INTO employer_reviews (job_id, reviewer_id, employer_id, rating, review_text) 
            VALUES (?, ?, ?, ?, ?)`;

        db.query(insertSql, [jobId, reviewerId, employerId, rating, review_text], (err) => {
            if (err) throw err;
            req.flash('success', 'Review submitted successfully!');
            res.redirect('/jobs/' + jobId);
        });
    });
});

// GET Route: View Job Details, Employer Rating Avg & Reviews
router.get('/:id', checkAuthenticated, (req, res) => {
    const jobId = req.params.id;

    const jobSql = `
        SELECT jobs.*, users.username AS employer_name, users.email AS employer_email, users.id AS employer_id 
        FROM jobs 
        JOIN users ON jobs.posted_by = users.id 
        WHERE jobs.id = ?`;

    db.query(jobSql, [jobId], (err, jobResults) => {
        if (err || jobResults.length === 0) {
            req.flash('error', 'Job not found.');
            return res.redirect('/jobs');
        }

        const job = jobResults[0];

        // Fetch employer average rating and review list
        const reviewSql = `
            SELECT employer_reviews.*, users.username AS reviewer_name 
            FROM employer_reviews 
            JOIN users ON employer_reviews.reviewer_id = users.id 
            WHERE employer_reviews.job_id = ?`;

        const avgSql = `SELECT AVG(rating) as avg_rating FROM employer_reviews WHERE employer_id = ?`;

        db.query(reviewSql, [jobId], (err, reviewResults) => {
            if (err) throw err;

            db.query(avgSql, [job.employer_id], (err, avgResult) => {
                if (err) throw err;

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
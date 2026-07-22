// =====================================================================================
// PART E - APPLICATION MANAGEMENT
// Functions: Apply for Job, View Applications, Withdraw/Delete Application,
//            Applicant Management, Status Management
// Author: Harsha - Student E
//
// Purpose:
// Lets a worker (role = 'user') apply for an event job, see the list of
// jobs they applied for, and withdraw an application. Lets an admin
// (employer) view every applicant across all jobs and update the
// status of each application (Pending / Accepted / Rejected).
// This file is self-contained: it only depends on the shared database
// connection and the session set up by the main app.js, same as
// routes/jobs.js.
//
// Application flow for each function:
// Apply     -> POST /applications/apply/:jobId    -> INSERT INTO Applications
// View      -> GET  /applications                 -> SELECT own applications (user)
// Manage    -> GET  /applications/manage           -> SELECT all applications (admin)
// Withdraw  -> POST /applications/withdraw/:id     -> DELETE FROM Applications
// Status    -> POST /applications/status/:id       -> UPDATE Applications SET status
// =====================================================================================

const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// =====================================================
// AUTHENTICATION CHECK (local to this feature)
// Purpose:
// Only logged-in users may reach any route in this file.
// Same pattern as routes/jobs.js.
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
// ADMIN-ONLY ACCESS CHECK
// Purpose:
// Only admin (employer) accounts can view every applicant
// and change an application's status.
// =====================================================
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Only admin accounts can manage applications.');
        res.redirect('/dashboard');
    }
};

// =====================================================
// WORKER-ONLY ACCESS CHECK
// Purpose:
// Only regular "user" (worker) accounts can apply for a
// job or look at their own list of applications.
// =====================================================
const checkWorker = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'user') {
        return next();
    } else {
        req.flash('error', 'Only worker accounts can apply for jobs.');
        res.redirect('/jobs');
    }
};

// =====================================================
// APPLY FOR JOB ROUTE
// Route: POST /applications/apply/:jobId
// Purpose:
// Lets a worker apply for an event job. Creates a new row
// in Applications with status "Pending". A user can't apply
// twice for the same job because of the UNIQUE KEY on the
// table (job_id, user_id).
// =====================================================
router.post('/apply/:jobId', checkAuthenticated, checkWorker, (req, res) => {
    const jobId = req.params.jobId;
    const userId = req.session.user.id;

    const sql = 'INSERT INTO Applications (job_id, user_id, status) VALUES (?, ?, ?)';

    db.query(sql, [jobId, userId, 'Pending'], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                req.flash('error', 'You have already applied for this job.');
                return res.redirect('/jobs/' + jobId);
            }
            throw err;
        }

        req.flash('success', 'Application submitted! You can check the status under My Applications.');
        res.redirect('/applications');
    });
});

// =====================================================
// VIEW MY APPLICATIONS ROUTE
// Route: GET /applications
// Purpose:
// Shows the logged-in worker every job they have applied
// for, and the current status of each application.
// =====================================================
router.get('/', checkAuthenticated, checkWorker, (req, res) => {
    const sql = `
        SELECT Applications.id, Applications.status, Applications.applied_at,
               Jobs.id AS job_id, Jobs.job_title, Jobs.event_name,
               Jobs.event_date, Jobs.location
        FROM Applications
        JOIN Jobs ON Applications.job_id = Jobs.id
        WHERE Applications.user_id = ?
        ORDER BY Applications.applied_at DESC
    `;

    db.query(sql, [req.session.user.id], (err, results) => {
        if (err) {
            throw err;
        }

        res.render('my-applications', {
            user: req.session.user,
            applications: results,
            messages: req.flash('success'),
            errors: req.flash('error')
        });
    });
});

// =====================================================
// WITHDRAW / DELETE APPLICATION ROUTE
// Route: POST /applications/withdraw/:id
// Purpose:
// Lets a worker withdraw (delete) their own application.
// Also lets an admin delete any application from the
// Applicant Management page.
// =====================================================
router.post('/withdraw/:id', checkAuthenticated, (req, res) => {
    const applicationId = req.params.id;

    // Admin can delete any application. A normal user can only
    // delete their own, so we add the user_id check for them.
    let sql = 'DELETE FROM Applications WHERE id = ?';
    let params = [applicationId];

    if (req.session.user.role !== 'admin') {
        sql = 'DELETE FROM Applications WHERE id = ? AND user_id = ?';
        params = [applicationId, req.session.user.id];
    }

    db.query(sql, params, (err, result) => {
        if (err) {
            throw err;
        }

        req.flash('success', 'Application withdrawn.');

        if (req.session.user.role === 'admin') {
            res.redirect('/applications/manage');
        } else {
            res.redirect('/applications');
        }
    });
});

// =====================================================
// APPLICANT MANAGEMENT ROUTE
// Route: GET /applications/manage
// Purpose:
// Shows the admin every application submitted across all
// jobs, along with the applicant's info so the admin can
// review who applied.
// =====================================================
router.get('/manage', checkAuthenticated, checkAdmin, (req, res) => {
    const sql = `
        SELECT Applications.id, Applications.status, Applications.applied_at,
               Jobs.job_title, Jobs.event_name,
               users.username AS applicant_name, users.email AS applicant_email
        FROM Applications
        JOIN Jobs ON Applications.job_id = Jobs.id
        JOIN users ON Applications.user_id = users.id
        ORDER BY Applications.applied_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            throw err;
        }

        res.render('manage-applications', {
            user: req.session.user,
            applications: results,
            messages: req.flash('success'),
            errors: req.flash('error')
        });
    });
});

// =====================================================
// STATUS MANAGEMENT ROUTE
// Route: POST /applications/status/:id
// Purpose:
// Lets the admin update an application's status to
// Pending, Accepted or Rejected.
// =====================================================
router.post('/status/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const { status } = req.body;
    const allowedStatuses = ['Pending', 'Accepted', 'Rejected'];

    if (!allowedStatuses.includes(status)) {
        req.flash('error', 'Invalid status.');
        return res.redirect('/applications/manage');
    }

    const sql = 'UPDATE Applications SET status = ? WHERE id = ?';

    db.query(sql, [status, req.params.id], (err, result) => {
        if (err) {
            throw err;
        }

        req.flash('success', 'Application status updated to ' + status + '.');
        res.redirect('/applications/manage');
    });
});

module.exports = router;

// End of Part E - Application Management ================================

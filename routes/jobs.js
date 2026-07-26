// =====================================================================================
// PART B - JOB MANAGEMENT
// Functions: Create Job, View Job, Edit Job, Delete Job, Accept Job
// Author: [Your Name] - Student B
//
// Purpose:
// Lets an admin (employer) account manage event job postings in the
// Jobs table, and lets a worker (role = 'user') accept a job. This file
// is self-contained: it only depends on the shared database connection
// and the session set up by the main app.js.
//
// Application flow for each function:
// Create -> GET /jobs/add (form) -> POST /jobs/add -> INSERT INTO Jobs
// View   -> GET /jobs (list all) -> SELECT * FROM Jobs
// Edit   -> GET /jobs/edit/:id (form) -> POST /jobs/edit/:id -> UPDATE Jobs
// Delete -> POST /jobs/delete/:id -> DELETE FROM Jobs
// Accept -> POST /jobs/accept/:id -> INSERT INTO job_applications
// =====================================================================================

const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const multer = require('multer');
const path = require('path');

// =====================================================
// PHOTO UPLOAD SETUP (multer)
// Purpose:
// Lets an admin attach a photo when creating/editing a job.
// Files are saved to /public/uploads/jobs so they can be
// served as static files (e.g. /uploads/jobs/169999-photo.jpg).
// =====================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/jobs'));
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp/;
        const ok = allowed.test(path.extname(file.originalname).toLowerCase());
        if (ok) return cb(null, true);
        cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed.'));
    }
});

// =====================================================
// AUTHENTICATION CHECK (local to this feature)
// Purpose:
// Only logged-in users may reach any route in this file.
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
// Only admin (employer) accounts may create, edit, or delete jobs.
// Regular users are redirected back to the dashboard.
// =====================================================
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Only admin accounts can manage jobs.');
        res.redirect('/dashboard');
    }
};

// =====================================================
// JOB VALIDATION MIDDLEWARE
// Purpose:
// Check that every job field is filled in and that
// salary / workers_required are valid positive numbers.
// Used by both Create and Edit.
// =====================================================
const validateJob = (req, res, next) => {
    const { job_title, event_name, description, location, nearest_station, salary, event_date, working_hours, workers_required } = req.body;

    // Express 5 removed res.redirect('back'), so we build the correct
    // "go back to the form" URL from the current request path instead.
    const backUrl = req.originalUrl;

    if (!job_title || !event_name || !description || !location || !nearest_station || !salary || !event_date || !working_hours || !workers_required) {
        req.flash('error', 'All fields are required.');
        req.flash('formData', req.body);
        return res.redirect(backUrl);
    }

    if (isNaN(salary) || Number(salary) <= 0) {
        req.flash('error', 'Salary must be a positive number.');
        req.flash('formData', req.body);
        return res.redirect(backUrl);
    }

    if (!Number.isInteger(Number(workers_required)) || Number(workers_required) <= 0) {
        req.flash('error', 'Number of workers required must be a positive whole number.');
        req.flash('formData', req.body);
        return res.redirect(backUrl);
    }

    next();
};

// =====================================================
// VIEW JOBS ROUTE
// Route: GET /jobs
// Purpose:
// List every job posting. Accessible to any logged-in user
// (admins see edit/delete controls, regular users see an
// Accept Job button or an "Accepted" label).
// =====================================================
router.get('/', checkAuthenticated, (req, res) => {
    const sql = 'SELECT * FROM jobs ORDER BY event_date ASC';

    db.query(sql, (err, results) => {
        if (err) {
            throw err;
        }

        // Find which jobs (if any) this user has already accepted,
        // so the view can show "Accepted" instead of the Accept button.
        const acceptedSql = 'SELECT job_id FROM job_applications WHERE user_id = ?';

        db.query(acceptedSql, [req.session.user.id], (err2, acceptedRows) => {
            if (err2) {
                throw err2;
            }

            const acceptedJobIds = acceptedRows.map(row => row.job_id);

            res.render('jobs', {
                user: req.session.user,
                jobs: results,
                acceptedJobIds: acceptedJobIds,
                messages: req.flash('success'),
                errors: req.flash('error'),
                location: '',
                date: '',
                sort: ''
            });
        });
    });
});

// =====================================================
// ADD JOB PAGE ROUTE
// Route: GET /jobs/add
// Purpose:
// Show the "Create Job" form. Admin only.
// =====================================================
router.get('/add', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('add-job', {
        user: req.session.user,
        errors: req.flash('error'),
        formData: req.flash('formData')[0]
    });
});

// =====================================================
// ADD JOB FORM SUBMISSION ROUTE
// Route: POST /jobs/add
// Purpose:
// Insert the new job posting into the Jobs table,
// linked to the admin account that posted it.
// =====================================================
router.post('/add', checkAuthenticated, checkAdmin, (req, res, next) => {
    // Run multer first so req.body/req.file are populated before validation
    upload.single('photo')(req, res, (err) => {
        if (err) {
            req.flash('error', err.message);
            req.flash('formData', req.body);
            return res.redirect('/jobs/add');
        }
        next();
    });
}, validateJob, (req, res) => {
    const { job_title, event_name, description, location, nearest_station, salary, event_date, working_hours, workers_required } = req.body;
    const postedBy = req.session.user.id;

    if (!req.file) {
        req.flash('error', 'A photo is required when creating a job.');
        req.flash('formData', req.body);
        return res.redirect('/jobs/add');
    }

    const photo = req.file.filename;

    // Yashveen Part B (START)
    const sql = `INSERT INTO jobs (job_title, event_name, description, location, nearest_station, salary, event_date, working_hours, workers_required, posted_by, photo)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    // Yashveen Part B (END)

    db.query(sql, [job_title, event_name, description, location, nearest_station, salary, event_date, working_hours, workers_required, postedBy, photo], (err, result) => {
        if (err) {
            throw err;
        }

        req.flash('success', 'Job created successfully!');
        res.redirect('/jobs');
    });
});

// =====================================================
// EDIT JOB PAGE ROUTE
// Route: GET /jobs/edit/:id
// Purpose:
// Show the "Edit Job" form pre-filled with the existing job's data.
// Admin only.
// =====================================================
router.get('/edit/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const sql = 'SELECT * FROM jobs WHERE id = ?';

    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            throw err;
        }

        if (results.length === 0) {
            req.flash('error', 'Job not found.');
            return res.redirect('/jobs');
        }

        res.render('edit-job', {
            user: req.session.user,
            job: results[0],
            errors: req.flash('error')
        });
    });
});

// =====================================================
// EDIT JOB FORM SUBMISSION ROUTE
// Route: POST /jobs/edit/:id
// Purpose:
// Update an existing job posting's details in the Jobs table.
// =====================================================
router.post('/edit/:id', checkAuthenticated, checkAdmin, (req, res, next) => {
    // Run multer first so req.body/req.file are populated before validation.
    // Photo is optional on edit - admin can leave it blank to keep the existing one.
    upload.single('photo')(req, res, (err) => {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('/jobs/edit/' + req.params.id);
        }
        next();
    });
}, validateJob, (req, res) => {
    const { job_title, event_name, description, location, nearest_station, salary, event_date, working_hours, workers_required } = req.body;

    // If a new photo was uploaded, use it. Otherwise keep the existing photo.
    if (req.file) {
        const photo = req.file.filename;
        const sql = `UPDATE jobs
                     SET job_title = ?, event_name = ?, description = ?, location = ?, nearest_station = ?,
                         salary = ?, event_date = ?, working_hours = ?, workers_required = ?, photo = ?
                     WHERE id = ?`;

        db.query(sql, [job_title, event_name, description, location, nearest_station, salary, event_date, working_hours, workers_required, photo, req.params.id], (err, result) => {
            if (err) {
                throw err;
            }
            req.flash('success', 'Job updated successfully!');
            res.redirect('/jobs');
        });
    } else {
        const sql = `UPDATE jobs
                     SET job_title = ?, event_name = ?, description = ?, location = ?, nearest_station = ?,
                         salary = ?, event_date = ?, working_hours = ?, workers_required = ?
                     WHERE id = ?`;

        db.query(sql, [job_title, event_name, description, location, nearest_station, salary, event_date, working_hours, workers_required, req.params.id], (err, result) => {
            if (err) {
                throw err;
            }
            req.flash('success', 'Job updated successfully!');
            res.redirect('/jobs');
        });
    }
});

// =====================================================
// DELETE JOB ROUTE
// Route: POST /jobs/delete/:id
// Purpose:
// Remove a job posting from the Jobs table. Admin only.
// =====================================================
router.post('/delete/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const sql = 'DELETE FROM jobs WHERE id = ?';

    db.query(sql, [req.params.id], (err, result) => {
        if (err) {
            throw err;
        }

        req.flash('success', 'Job deleted successfully!');
        res.redirect('/jobs');
    });
});

// =====================================================
// WORKER-ONLY ACCESS CHECK
// Purpose:
// Only regular "user" (worker) accounts can accept a job.
// Admins post jobs, they don't accept them.
// =====================================================
const checkWorker = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'user') {
        return next();
    } else {
        req.flash('error', 'Only worker accounts can accept jobs.');
        res.redirect('/jobs');
    }
};

// =====================================================
// ACCEPT JOB ROUTE
// Route: POST /jobs/accept/:id
// Purpose:
// Lets a worker (role = 'user') accept an event job.
// Records the acceptance in job_applications, and blocks
// the same user accepting the same job twice.
// =====================================================
router.post('/accept/:id', checkAuthenticated, checkWorker, (req, res) => {
    const jobId = req.params.id;
    const userId = req.session.user.id;

    const sql = 'INSERT INTO job_applications (job_id, user_id) VALUES (?, ?)';

    db.query(sql, [jobId, userId], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                req.flash('error', 'You have already accepted this job.');
                return res.redirect('/jobs');
            }
            throw err;
        }

        req.flash('success', 'Job accepted! The employer can now see you on this listing.');
        res.redirect('/jobs');
    });
});

module.exports = router;

// End of Part B - Job Management ================================

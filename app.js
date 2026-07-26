const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const db = require('./db/connection');

const app = express();

// =====================================================
// ADMIN SECRET KEY
// Purpose:
// Secret key to verify admin registration.
// =====================================================
const ADMIN_SECRET_KEY = 'ADMIN_EVENT2026';

// =====================================================
// BASIC EXPRESS SETUP
// Purpose:
// Read form data and load CSS/images from public folder.
// =====================================================
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// =====================================================
// EJS SETUP
// Purpose:
// Allows Express to render .ejs files from views folder.
// =====================================================
app.set('view engine', 'ejs');

// =====================================================
// SESSION SETUP
// Purpose:
// Remember logged-in users between page visits.
// =====================================================
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

// =====================================================
// FLASH MESSAGE SETUP
// Purpose:
// Show temporary success/error messages.
// =====================================================
app.use(flash());

// =====================================================
// AUTHENTICATION MIDDLEWARE
// Purpose:
// Protect pages so only logged-in users can access them.
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
// HOME PAGE ROUTE
// Purpose:
// Show homepage with Home, Login, Register buttons.
// If user is logged in, show Dashboard and Logout.
// =====================================================
app.get('/', (req, res) => {
    res.render('index', {
        user: req.session.user,
        messages: req.flash('success')
    });
});

// =====================================================
// REGISTER PAGE ROUTE
// Purpose:
// Show register page.
// This allows the Register button/link to work.
// =====================================================
app.get('/register', (req, res) => {
    res.render('register', {
        messages: req.flash('error'),
        formData: req.flash('formData')[0]
    });
});

// =====================================================
// REGISTER VALIDATION MIDDLEWARE
// Purpose:
// Check that all registration fields are filled.
// Check password strength and admin secret key.
// =====================================================
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role, adminKey } = req.body;

    if (!username || !email || !password || !contact || !role) {
        req.flash('error', 'All fields are required.');
        req.flash('formData', sanitizeFormData(req.body));
        return res.redirect('/register');
    }

    // Password validation pattern
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

    if (!passwordPattern.test(password)) {
        req.flash('error', 'Password must be at least 6 characters long and include letters, numbers, and one special character.');
        req.flash('formData', sanitizeFormData(req.body));
        return res.redirect('/register');
    }

    if (role !== 'admin' && role !== 'user') {
        req.flash('error', 'Invalid role selected.');
        req.flash('formData', sanitizeFormData(req.body));
        return res.redirect('/register');
    }

    // -----------------------------------------------
    // ADMIN SECRET KEY + ADDRESS CHECK
    // -----------------------------------------------
    if (role === 'admin') {
        if (!adminKey || adminKey !== ADMIN_SECRET_KEY) {
            req.flash('error', 'Invalid admin secret key.');
            req.flash('formData', sanitizeFormData(req.body));
            return res.redirect('/register');
        }

        if (!address) {
            req.flash('error', 'Address is required for admin (employer) accounts.');
            req.flash('formData', sanitizeFormData(req.body));
            return res.redirect('/register');
        }
    }

    next();
};

// =====================================================
// SANITIZE FORM DATA (helper)
// Purpose:
// Remove sensitive data (passwords, admin keys) before
// storing form data in flash session.
// =====================================================
function sanitizeFormData(body) {
    const { password, adminKey, ...safeData } = body;
    return safeData;
}

// =====================================================
// VERIFY ADMIN SECRET KEY ROUTE (AJAX)
// Purpose:
// Allow frontend to validate admin key in real-time.
// =====================================================
app.post('/register/verify-admin-key', (req, res) => {
    const { adminKey } = req.body;
    const valid = Boolean(adminKey) && adminKey === ADMIN_SECRET_KEY;
    res.json({ success: valid });
});

// =====================================================
// REGISTER FORM SUBMISSION ROUTE
// Purpose:
// Insert new user into users table.
// Password is stored using SHA1 hashing.
// =====================================================
app.post('/register', validateRegistration, (req, res) => {
    const { username, email, password, address, contact, role } = req.body;

    const finalAddress = address || '';

    const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';

    db.query(sql, [username, email, password, finalAddress, contact, role], (err, result) => {
        if (err) {
            throw err;
        }

        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

// =====================================================
// LOGIN PAGE ROUTE
// Purpose:
// Show login page.
// =====================================================
app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});

// =====================================================
// LOGIN FORM SUBMISSION ROUTE
// Purpose:
// Check email and password from users table.
// If correct, save user into session.
// =====================================================
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';

    db.query(sql, [email, password], (err, results) => {
        if (err) {
            throw err;
        }

        if (results.length > 0) {
            req.session.user = results[0];
            req.flash('success', 'Login successful!');
            return res.redirect('/dashboard');
        }

        req.flash('error', 'Invalid email or password.');
        res.redirect('/login');
    });
});

// =====================================================
// DASHBOARD ROUTE
// Purpose:
// Protected page.
// Only logged-in users can access.
// Admins see job and application statistics.
// =====================================================
app.get('/dashboard', checkAuthenticated, (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.render('dashboard', {
            user: req.session.user,
            overview: null,
            errors: req.flash('error')
        });
    }

    const jobsCountSql = 'SELECT COUNT(*) AS total FROM jobs';

    db.query(jobsCountSql, (err, jobsResult) => {
        if (err) {
            throw err;
        }

        const statusCountSql = 'SELECT status, COUNT(*) AS total FROM applications GROUP BY status';

        db.query(statusCountSql, (err2, statusResults) => {
            if (err2) {
                throw err2;
            }

            const overview = {
                totalJobs: jobsResult[0].total,
                totalApplications: 0,
                pending: 0,
                accepted: 0,
                rejected: 0
            };

            statusResults.forEach((row) => {
                const key = row.status.toLowerCase();
                if (Object.prototype.hasOwnProperty.call(overview, key)) {
                    overview[key] = row.total;
                }
                overview.totalApplications += row.total;
            });

            res.render('dashboard', {
                user: req.session.user,
                overview: overview,
                errors: req.flash('error')
            });
        });
    });
});

// =====================================================
// LOGOUT ROUTE
// Purpose:
// Destroy session and log user out.
// =====================================================
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// =====================================================
// PART B - JOB MANAGEMENT
// Feature: Post New Job / View / Edit / Delete / Accept
// Purpose:
// All routes for this feature live in routes/jobs.js
// Mounted here so its routes become /jobs/add, /jobs/edit/:id, etc.
// =====================================================
const jobsRouter = require('./routes/jobs');
app.use('/jobs', jobsRouter);

// =====================================================
// PART C - BROWSE JOBS
// Feature: View all jobs and job details
// Purpose:
// Mounted at the same /jobs base so its route becomes /jobs/:id
// Must be mounted AFTER jobsRouter so static paths like /jobs/add
// are matched first.
// =====================================================
const browseRouter = require('./routes/browse');
app.use('/jobs', browseRouter);

// =====================================================
// PART E - APPLICATION MANAGEMENT
// Feature: Apply for Job / View Applications / Withdraw /
//          Applicant Management / Status Management
// Purpose:
// All routes for this feature live in routes/applications.js
// Mounted here so its routes become /applications (GET and POST).
// =====================================================
const applicationsRouter = require('./routes/applications');
app.use('/applications', applicationsRouter);

// =====================================================
// FAVOURITES FEATURE
// Purpose:
// Allow users to save/bookmark favourite jobs.
// =====================================================
const favouritesRouter = require('./routes/favourites');
app.use('/favourites', favouritesRouter);

// =====================================================
// PROFILE FEATURE
// Purpose:
// Allow users to view and manage their profile.
// =====================================================
const profileRouter = require('./routes/profile');
app.use('/profile', profileRouter);

// =====================================================
// START SERVER
// Purpose:
// Run app on http://localhost:3000
// =====================================================
app.listen(3000, () => {
    console.log(`Server started on port http://localhost:3000`);
});

const express = require('express');
const router = express.Router();
const db = require('../db/connection'); // adjust if your DB connection file is named differently

// Middleware: only logged-in users can favourite
const checkAuthenticated = (req, res, next) => {
  if (req.session.user) return next();
  req.flash('error', 'Please log in first.');
  res.redirect('/login');
};

// Add to favourites
router.post('/add/:jobId', checkAuthenticated, (req, res) => {
  const jobId = req.params.jobId;
  const userId = req.session.user.id;

  const sql = 'INSERT INTO favorites (user_id, job_id) VALUES (?, ?)';
  db.query(sql, [userId, jobId], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        req.flash('error', 'Already in favourites.');
        return res.redirect('/jobs');
      }
      console.error(err);
      req.flash('error', 'Failed to add favourite.');
      return res.redirect('/jobs');
    }
    req.flash('success', 'Job added to favourites!');
    res.redirect('/jobs');
  });
});

// Remove from favourites
router.post('/remove/:jobId', checkAuthenticated, (req, res) => {
  const jobId = req.params.jobId;
  const userId = req.session.user.id;

  const sql = 'DELETE FROM favorites WHERE user_id = ? AND job_id = ?';
  db.query(sql, [userId, jobId], (err) => {
    if (err) {
      console.error(err);
      req.flash('error', 'Failed to remove favourite.');
      return res.redirect('/favourites');
    }
    req.flash('success', 'Job removed from favourites.');
    res.redirect('/favourites');
  });
});

// View favourites
router.get('/', checkAuthenticated, (req, res) => {
  const userId = req.session.user.id;
  const sql = `
    SELECT jobs.id, jobs.job_title, jobs.event_name, jobs.location, jobs.nearest_station, jobs.salary, jobs.event_date
    FROM jobs
    INNER JOIN favorites ON jobs.id = favorites.job_id
    WHERE favorites.user_id = ?`;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.render('favourites', {
        user: req.session.user,
        jobs: [],
        messages: [],
        errors: ['Failed to load favourites']
      });
    }
    res.render('favourites', {
      user: req.session.user,
      jobs: results,
      messages: req.flash('success'),
      errors: req.flash('error')
    });
  });
});

module.exports = router;


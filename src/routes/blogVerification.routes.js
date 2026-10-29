const express = require('express');
const blogVerificationController = require('../controllers/blogVerification.controller');

const router = express.Router();

// POST /api/v1/blogs/verify
router.post('/verify', (req, res, next) => {
  blogVerificationController.verify(req, res, next);
});

module.exports = router;

const express = require('express');
const { getSignup, onCreateUser, getLogin, onLogin, onLogout } = require('../controllers/users');
const isAuth = require('../middleware/is-auth.js');
const { check } = require('express-validator')

const router = express.Router();

// Views

router.get('/new-user-form', getSignup)

router.get('/login', getLogin)

// functions

router.post('/create-user', check('email').isEmail(), onCreateUser)

router.post('/signin',   onLogin)

router.get('/logout', onLogout)

module.exports = router;
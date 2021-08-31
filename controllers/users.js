const bcrypt = require('bcryptjs')
const { validationResult } = require('express-validator')

const User = require('../models/user');


const getSignup = (req, res, next) => {
    const fields = [
        {name: "username", description: "Enter a username", type: "text"},
        {name: "email", description: "Enter email", type:"email" },
        {name: "password", description: "Enter password", type: "password"},
        {name: "passwordVerification", description: "Verify password", type: "password"},
        {name: "role", description: "Type of role for new user"}
    ]
    res.render('admin/new-user', {
        pageTitle: 'Add new user',
        path: '/admin/new-user',
        fields: fields,
        isAuthenticated: req.session.isLoggedIn,
    })

}

const getLogin = (req, res, next) => {
    const fields = [
        {name: "email", description: "Enter email", type:"email" },
        {name: "password", description: "Enter password", type: "password"},
    ]
    res.render('user/login', {
        pageTitle: 'Login',
        path: '/login',
        fields: fields,
        isAuthenticated: req.session.isLoggedIn
    })
}

// FUNCTIONS

const onCreateUser = async (req, res, next) => {
    const { username , email, password, role } = req.body;
    const errors = validationResult(req)
    console.log('checking for errors', errors)
    // if (!errors.isEmpty()) {
    //     console.log(errors.array())
    //         return;
    //     }
    // }
    const isExist = await User.findOne({ email })
    if (isExist) return res.redirect('/signup') 

    const hashed = await bcrypt.hash(password, 12);
    try {
        const newUser = new User({
            username,
            email, 
            password: hashed,
            role
        })
        newUser.save();
        req.session.isLoggedIn = true;
        req.session.user = newUser._id;
        req.session.save();
        res.redirect('/')
    } catch (err) {
        res.redirect('/signup')
    }
}

const onLogin = async (req, res, next) => {
    const { email, password } = req.body;
    const isExist = await User.findOne({ email })
    if (!isExist) return res.redirect('/login');


    try {
        const doMatch = await bcrypt.compare(password, isExist.password)
        // add session logic
        if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = isExist._id;
            req.session.save();
            res.redirect('/')
        }
        else res.redirect('/login')
    } catch (err) {
        next(err)
        res.redirect('/login')
    }
    }

const onLogout = (req, res, next) => {

    try {
        if (req.session) {
            req.session.destroy();
            res.redirect('/')
        }
    } catch (err) {
        next(err)
    }

}
   


exports.onLogin = onLogin
exports.onLogout = onLogout
exports.getSignup = getSignup
exports.getLogin = getLogin
exports.onCreateUser = onCreateUser
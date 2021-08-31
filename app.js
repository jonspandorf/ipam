const path = require('path')
const express = require('express');
const mongoose = require('mongoose');
const { json } = require('express');
const cors = require('cors');
const bodyParser = require('body-parser')
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);


const ipamRoutes = require('./routes/ipam')
const userRoutes = require('./routes/users');
const User = require('./models/user');

const dbUrl = process.env.DB_URL

const app = express();
const store = new MongoDBStore({
    uri: dbUrl, 
    collection: 'sessions',
})

app.set('view engine', 'ejs');
app.set('views', 'views');


app.use(json()) 
app.use(cors())
app.use(bodyParser.urlencoded({ urlencoded: false }))
app.use(express.static(path.join(__dirname, 'public')));
app.use(
    session({
        secret: 'my secret',
        resave: false,
        saveUninitialized: false,
        store: store
    })
)

app.use( async (req, res, next) => {
    if (!req.session.user) {
      return next();
    }
    try {
        const user = await User.findById(req.session.user._id)
        req.user = user;
        next()
    } catch (err) {
        next(err)
    }
  });
  

app.use('/', ipamRoutes)
app.use('/', userRoutes)

app.use((error, req, res, next) => {
    res.render('user/error', {
        pageTitle: `Error ${error.httpStatusCode}`,
        path:'/error',
        isAuthenticated: req.session.isLoggedIn,
        // statusCode: error.httpStatusCode,
        message: 'something occured! please try again!'
    })
})

const port = process.env.PORT
const url = process.env.URL

mongoose
.connect(dbUrl, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true } )
.then(() => {
    app.listen(port, () => {
        console.log(`server is now listening at http://${url}:${port}`)
    })
})
.catch ((err) => {
    console.error(err);
}) 




require('dotenv').config();

const express = require("express");
const passport = require('passport');
const session = require('express-session');
const { connectToDatabase, getUserCollection } = require('./utils/db');
const auth = require('./utils/auth');
const { v4: uuidv4 } = require("uuid");
const { ExpressPeerServer } = require("peer");
const url = require("url");

const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const peerServer = ExpressPeerServer(server, {
    debug: true,
});

const path = require("path");

app.use(
    session({
        secret: process.env.SECRET_KEY ||'it_is_my_secretkey_for_conferenceapp',
        resave: false,
        saveUninitialized: true,
    })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');
app.use('/public', express.static(path.join(__dirname, 'static')));
app.use('/peerjs', peerServer);

// User registration and login routes
app.get('/register', (req, res) => {
    res.render('register'); // Create a register.ejs file
});

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const users = await getUserCollection();

    // Check if user with the same email already exists
    const existingUser = await users.findOne({ email });
    if (existingUser) {
        return res.render('register', { error: 'Email already in use.' });
    }

    // Save the new user to the database
    await users.insertOne({ username, email, password });

    // Redirect to login page
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login'); // Create a login.ejs file
});

app.post(
    '/login',
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/login',
        failureFlash: true,
    })
);

// app.get("/join/:rooms", (req, res) => {
//     res.render("room", { roomid: req.params.rooms, Myname: req.query.name });
// });

app.get("/join/:rooms", (req, res) => {
    res.render("room", { 
      roomid: req.params.rooms, 
      Myname: req.query.name 
    });
  });

// Dashboard route
app.get('/dashboard', auth.isAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.user }); // Create a dashboard.ejs file
});

// Logout route
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "static", "index.html"));
}); 

app.get("/join", (req, res) => {
    res.redirect(
        url.format({
            pathname: `/join/${uuidv4()}`,
            query: req.query,
        })
    );
});

app.get("/joinold", (req, res) => {
    res.redirect(
        url.format({
            pathname: req.query.meeting_id,
            query: req.query,
        })
    );
});



io.on("connection", (socket) => {
    socket.on("join-room", (roomId, id, myname) => {
        socket.join(roomId);
        socket.to(roomId).broadcast.emit("user-connected", id, myname);

        socket.on("messagesend", (message) => {
            console.log(message);
            io.to(roomId).emit("createMessage", message);
        });

        socket.on("tellName", (myname) => {
            console.log(myname);
            socket.to(roomId).broadcast.emit("AddName", myname);
        });

        socket.on("disconnect", () => {
            socket.to(roomId).broadcast.emit("user-disconnected", id);
        });
    });
});

const PORT = process.env.PORT || 3030;

connectToDatabase().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Error connecting to the database:', error);
});
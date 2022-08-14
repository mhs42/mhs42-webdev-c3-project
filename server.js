const express = require("express");
const app = express();
const mysql = require("mysql");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const path = require("path");
// sudo npm install cookie-session
// cookie-session allows us to let a user stay logged in for maxAge amount of time (in milliseconds)
const cookieSession = require("cookie-session");
const ejs = require("ejs");
// sudo npm install luxon
const {DateTime} = require("luxon");
// sudo npm install dotenv
// const dotenv = require("dotenv").config();
require("dotenv").config();

const authenticationMiddleware = (req, resp, next) =>
{
    if (req.session.hasOwnProperty("user_id"))
    {
        next();
    }
    else
    {
        resp.redirect("/login.html");
    }
};

app.set("view engine", "ejs");
app.use(express.static("resources"));
app.use(cookieSession({
    name: 'session',
    keys: [process.env.COOKIESESSIONKEY],
    maxAge: 24 * 60 * 60 * 1000,
}));
app.use(bodyParser.urlencoded({ extended: true }));

const con = mysql.createConnection(process.env.MYSQL_CON_STRING);

con.connect((err) =>
{
    if (err) throw err;
    else console.log("Connected to MySQL successfully.");
});

app.get("/", (req, resp) =>
{
    send("Hello world");
});

app.post("/signup", (req, resp) =>
{
    bcrypt.hash(req.body.password, 10, (err, hashed_password) =>
    {
        if (err) throw err;
        con.query(`INSERT INTO Users (name, email, password) VALUES ('${req.body.full_name}', '${req.body.email}', '${hashed_password}')`, (err, result) =>
        {
            if (err) resp.send("An error has occured");
            else resp.send("Signup Successful!");
        });
    });
});

app.post("/login", (req, resp) =>
{
    const email = req.body.email;
    const text_password = req.body.password;
    con.query(`SELECT id, name, password FROM Users WHERE email='${email}'`, (err, results) =>
    {
        if (err) resp.sendStatus(500);
        else
        {
            const correct_password_hash = results[0].password;
            bcrypt.compare(text_password, correct_password_hash, (err, comparison_result) =>
            {
                if (err) throw err;
                if (comparison_result)
                {
                    req.session.user_id = results[0].id;
                    req.session.user_name = results[0].name;
                    resp.redirect("/feed");
                }
                else resp.sendStatus(401);
            });
        };
    });
});

app.get("/logout", authenticationMiddleware, (req, resp) =>
{
    req.session = null;
    resp.redirect("/login.html");
});

app.get("/myprofile", authenticationMiddleware, (req, resp) =>
{
    resp.render("myprofile.ejs", {
        name: req.session.user_name
    });
});

app.get("/feed",authenticationMiddleware, (req, resp) =>
{
    resp.render("feed.ejs", {
        name: req.session.user_name,
        user_id: req.session.user_id
    });
});

// SQL Injection
app.post("/post/new", authenticationMiddleware, (req, resp) =>
{
    if (req.body.hasOwnProperty("content") && req.body.content != "")
    {
        con.query("INSERT INTO Posts (content, user_id) VALUES (?, ?)", [req.body.content, req.session.user_id], (err, result) =>
        {
            if (err) resp.sendStatus(500);
            else resp.sendStatus(201);
        });
    }
    else resp.sendStatus(400)   // Bad request
});

app.get("/post/all", authenticationMiddleware, (req, resp) =>
{
    con.query("SELECT Posts.id, Posts.content, Posts.date_posted, Users.name, Users.id AS user_id FROM Posts INNER JOIN Users ON Posts.user_id=Users.id;", (err, result) =>
    {
        if (err) resp.sendStatus(500);
        else
        {
            // console.log(result);
            const final = result.map(post =>
            {
                // Look at documentation on https://moment.github.io/luxon/api-docs/index.html and click on DateTime
                post.date_posted = DateTime.fromJSDate(post.date_posted).toFormat("dd LLL yyyy");
                return post;
            });
            resp.json(final);
        }
    });
});

app.listen(process.env.PORT, () =>
{
    console.log("Server listening on port " + process.env.PORT);
});
/**
 * Module dependencies.
 */
import * as path from "path";
import * as lusca from "lusca";
import * as logger from "morgan";
import * as dotenv from "dotenv";
import * as express from "express";
import * as mongoose from "mongoose";
import * as passport from "passport";
import * as mongo from "connect-mongo";
import * as flash from "express-flash";
import * as bodyParser from "body-parser";
import * as session from "express-session";
import * as compression from "compression";
import * as errorHandler from "errorhandler";
import expressValidator = require("express-validator");

const MongoStore = mongo(session);

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: ".env" });

/**
 * Controllers (route handlers)
 */
import * as homeController from "./controllers/home";
import * as userController from "./controllers/user";
import * as dashboardController from "./controllers/dashboard";

/**
 * API keys and Passport configuration
 */
import * as passportConfig from "./config/passport";

/**
 * Create express session
 */
const app = express();

/**
 * Connect to MongoDB.
 */
// mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI, { useMongoClient: true });

mongoose.connection.on("error", () => {
    console.log("MongoDB connection error. Please ensure MongoDB is running");
    process.exit();
});

/**
 * Express configuration.
 */
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.use(compression());
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
        url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
        autoReconnect: true
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});
app.use((req, res, next) => {
    // After successful login, redirect back to intended page
    if (!req.user &&
        req.path !== "/login" &&
        req.path !== "/signup" &&
        !req.path.match(/^\/auth/) &&
        !req.path.match(/\./)) {
        req.session.returnTo = req.path;
    } else if (req.user &&
        req.path == "/account") {
        req.session.returnTo = req.path;
    }
    next();
});
app.use(express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }));

/**
 * Primary app routes.
 */
app.get("/", homeController.index);
app.get("/login", userController.getLogin);
app.post("/login", userController.postLogin);
app.get("/logout", userController.logout);
app.get("/forgot", userController.getForgot);
app.post("/forgot", userController.postForgot);
app.get("/reset/:token", userController.getReset);
app.post("/reset/:token", userController.postReset);
app.get("/signup", userController.getSignup);
app.post("/signup", userController.postSignup);
// app.get("/contact", contactController.getContact);
// app.post("/contact", contactController.postContact);
app.get("/account", passportConfig.isAuthenticated, userController.getAccount);
app.post("/account/profile", passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post("/account/password", passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post("/account/delete", passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get("/dashboard", passportConfig.isEOLMember, dashboardController.index);

/**
 * API routes.
 */


/**
 * OAuth authentication routes.
 */
app.get("/auth/eve_online", passport.authenticate("eve_online"));
app.get("/auth/eve_online/callback", passport.authenticate("eve_online", { failureRedirect: "/" }), (req, res) => {
    res.redirect("/dashboard");
});

 /**
  * Error handler.
  */
app.use(errorHandler());

/**
 * Start Express server.
 */
app.listen(app.get("port"), () => {
    console.log(`App is running at http://localhost:3000 in dev mode.`);
    console.log("Press CTRL-C to stop\n");
});

module.exports = app;
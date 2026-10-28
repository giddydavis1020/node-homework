
const { userSchema } = require("../validation/userSchema");
const crypto = require("crypto");
const util = require("util");

const scrypt = util.promisify(crypto.scrypt);

// Hash a password before storing it
const hashPassword = async (password) => {
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = await scrypt(password, salt, 64);

    return `${salt}:${derivedKey.toString("hex")}`;
};

// Compare a login password with the stored hash
const comparePassword = async (inputPassword, storedHash) => {
    if (typeof storedHash !== "string") {
        return false;
    }

    const [salt, key] = storedHash.split(":");

    if (!salt || !key || !/^[0-9a-f]{128}$/i.test(key)) {
        return false;
    }

    const derivedKey = await scrypt(inputPassword, salt, 64);
    const storedKey = Buffer.from(key, "hex");

    return crypto.timingSafeEqual(derivedKey, storedKey);
};

// Register a new user
const register = async (req, res) => {
    if (!req.body) req.body = {};

    const { error, value } = userSchema.validate(req.body, {
        abortEarly: false
    });

    if (error) {
        return res.status(400).json({
            message: error.details.map(detail => detail.message).join(", ")
        });
    }

    const { name, email, password } = value;

    const existingUser = global.users.find(
        user => user.email === email
    );

    if (existingUser) {
        return res.status(409).json({
            message: "User already exists"
        });
    }

    const hashedPassword = await hashPassword(password);

    const user = {
        name,
        email,
        hashedPassword
    };

    global.users.push(user);

    global.user_id = user;

    res.status(201).json({
        name: user.name,
        email: user.email
    });
};

// Log in an existing user
const logon = async (req, res) => {
    const { email, password } = req.body || {};

    const user = global.users.find(
        user => user.email === email
    );

    const goodCredentials = user &&
        typeof password === "string" &&
        await comparePassword(password, user.hashedPassword);

    if (!goodCredentials) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    global.user_id = user;

    res.status(200).json({
        name: user.name,
        email: user.email
    });
};

// Log out the current user
const logoff = (req, res) => {
    global.user_id = null;

    res.sendStatus(200);
};

module.exports = { register, logon, logoff };

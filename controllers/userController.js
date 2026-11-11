
const pool = require("../db/pg-pool");
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
const register = async (req, res, next) => {
    const { error, value } = userSchema.validate(req.body || {}, {
        abortEarly: false
    });

    if (error) {
        return res.status(400).json({
            message: "Validation failed",
            details: error.details
        });
    }

    const { name, email, password } = value;
    const hashedPassword = await hashPassword(password);

    try {
        const result = await pool.query(
            `INSERT INTO users (email, name, hashed_password)
             VALUES ($1, $2, $3)
             RETURNING id, email, name`,
            [email, name, hashedPassword]
        );

        const user = result.rows[0];

        global.user_id = user.id;

        return res.status(201).json({
            name: user.name,
            email: user.email
        });

    } catch (err) {
        if (err.code === "23505") {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        if (next) return next(err);
        throw err;
    }
};

// Log in an existing user
const logon = async (req, res, next) => {
    const { email, password } = req.body || {};

    if (typeof email !== "string" ||
        typeof password !== "string") {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        const user = result.rows[0];

        if (!user || !(await comparePassword(password, user.hashed_password))) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        global.user_id = user.id;

        return res.status(200).json({
            name: user.name,
            email: user.email
        });

    } catch (err) {
        if (next) return next(err);
        throw err;
    }
};

// Log out the current user
const logoff = (req, res) => {
    global.user_id = null;
    return res.sendStatus(200);
};

module.exports = { register, logon, logoff };

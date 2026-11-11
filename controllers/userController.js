const { userSchema } = require("../validation/userSchema");
const crypto = require("crypto");
const util = require("util");
const prisma = require("../db/prisma");

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

// Register a new user using Prisma
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
        const user = await prisma.user.create({
            data: {
                name,
                email,
                hashedPassword
            },
            select: {
                name: true,
                email: true,
                id: true
            }
        });

        global.user_id = user.id;

        return res.status(201).json({
            name: user.name,
            email: user.email
        });

    } catch (err) {
        if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        return next(err);
    }
};

// Log in an existing user using Prisma
const logon = async (req, res, next) => {
    let { email, password } = req.body || {};

    if (typeof email !== "string" ||
        typeof password !== "string") {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    try {
        // Convert email to lowercase before searching
        email = email.toLowerCase();

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user || !(await comparePassword(password, user.hashedPassword))) {
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
        return next(err);
    }
};

// Log out the current user
const logoff = (req, res) => {
    global.user_id = null;
    return res.sendStatus(200);
};

module.exports = { register, logon, logoff };


const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

// generate unique task IDs
let nextTaskId = 1;

function taskCounter() {
    return nextTaskId++;
}

// remove userId before returning tasks
function sanitizeTask(task) {
    const { userId, ...sanitizedTask } = task;
    return sanitizedTask;
}

// create a new task
exports.create = async (req, res) => {
    if (!req.body) req.body = {};

    const { error, value } = taskSchema.validate(req.body, {
        abortEarly: false
    });

    if (error) {
        return res.status(400).json({
            message: error.details.map(detail => detail.message).join(", ")
        });
    }

    if (!global.user_id || !global.user_id.email) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const newTask = {
        id: taskCounter(),
        userId: global.user_id.email,
        ...value
    };

    global.tasks.push(newTask);

    return res.status(201).json(sanitizeTask(newTask));
};

// get all tasks belonging to the logged-in user
exports.index = async (req, res) => {
    if (!global.user_id || !global.user_id.email) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const userTasks = global.tasks.filter(
        task => task.userId === global.user_id.email
    );

    if (userTasks.length === 0) {
        return res.status(404).json({
            message: "No tasks found"
        });
    }

    const sanitizedTasks = userTasks.map(
        task => sanitizeTask(task)
    );

    return res.status(200).json(sanitizedTasks);
};

// get a specific task belonging to the logged-in user
exports.show = async (req, res) => {
    if (!global.user_id || !global.user_id.email) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const taskId = Number(req.params?.id);

    if (!Number.isSafeInteger(taskId) || taskId <= 0) {
        return res.status(400).json({
            message: "Invalid task ID"
        });
    }

    const task = global.tasks.find(
        task => task.id === taskId &&
        task.userId === global.user_id.email
    );

    if (!task) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    return res.status(200).json(sanitizeTask(task));
};

// update an existing task
exports.update = async (req, res) => {
    if (!req.body) req.body = {};

    const { error, value } = patchTaskSchema.validate(req.body, {
        abortEarly: false
    });

    if (error) {
        return res.status(400).json({
            message: error.details.map(detail => detail.message).join(", ")
        });
    }

    if (!global.user_id || !global.user_id.email) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const taskId = Number(req.params?.id);

    if (!Number.isSafeInteger(taskId) || taskId <= 0) {
        return res.status(400).json({
            message: "Invalid task ID"
        });
    }

    const task = global.tasks.find(
        task => task.id === taskId &&
        task.userId === global.user_id.email
    );

    if (!task) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    Object.assign(task, value);

    return res.status(200).json(sanitizeTask(task));
};

// delete a task belonging to the logged-in user
exports.deleteTask = async (req, res) => {
    if (!global.user_id || !global.user_id.email) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const taskId = Number(req.params?.id);

    if (!Number.isSafeInteger(taskId) || taskId <= 0) {
        return res.status(400).json({
            message: "Invalid task ID"
        });
    }

    const taskIndex = global.tasks.findIndex(
        task => task.id === taskId &&
        task.userId === global.user_id.email
    );

    if (taskIndex === -1) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    const deletedTask = sanitizeTask(global.tasks[taskIndex]);

    global.tasks.splice(taskIndex, 1);

    return res.status(200).json(deletedTask);
};

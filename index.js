const express = require("express");
const sqlite3 = require("sqlite3");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const { open } = require("sqlite");

const app = express();
const dbPath = path.join(__dirname, "database.db");

app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);


let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Create users table
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student', 'teacher'))
      )
    `);

    const sampleUsers = [
      { username: "Ramkumar", password: "ram", role: "student" },
      { username: "Karthikeyan", password: "karthi", role: "teacher" },
      { username: "Sabarinathan", password: "sabari", role: "student" },
      { username: "Marudhupandi", password: "marudhu", role: "teacher" },
    ];

    for (const user of sampleUsers) {
      const { username, password, role } = user;
      try {
        await db.run(
          "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
          [username, password, role]
        );
        console.log(`Sample user ${username} added successfully.`);
      } catch (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          console.log(`Sample user ${username} already exists.`);
        } else {
          console.error("Error inserting sample user:", err);
        }
      }
    }

    // Create students table
    await db.run(`
      CREATE TABLE IF NOT EXISTS students (
        student_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        grade TEXT NOT NULL,
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    const sampleStudents = [
      { name: "Ramkumar", grade: "A", user_id: 1 },
      { name: "Sabarinathan", grade: "B", user_id: 3 },
    ];

    for (const student of sampleStudents) {
      const { name, grade, user_id } = student;
      try {
        await db.run(
          "INSERT INTO students (name, grade, user_id) VALUES (?, ?, ?)",
          [name, grade, user_id]
        );
      } catch (err) {
        console.error("Error inserting sample student:", err);
      }
    }

    // Create teachers table
    await db.run(`
      CREATE TABLE IF NOT EXISTS teachers (
        teacher_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        subject TEXT NOT NULL,
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    const sampleTeachers = [
      { name: "Karthikeyan", subject: "Maths", user_id: 2 },
      { name: "Marudhupandi", subject: "Science", user_id: 4 },
    ];

    for (const teacher of sampleTeachers) {
      const { name, subject, user_id } = teacher;
      try {
        await db.run(
          "INSERT INTO teachers (name, subject, user_id) VALUES (?, ?, ?)",
          [name, subject, user_id]
        );
      } catch (err) {
        console.error("Error inserting sample teacher:", err);
      }
    }

    console.log("Database setup completed.");
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
  app.listen(3001, () => {
    console.log("Server is running at http://localhost:3001/");
  });
};

initializeDbAndServer();

// Login route
app.post("/login", async (req, res) => {
  const { name, role, password } = req.body;
  //console.log(req.body)
  const table = role === "teacher" ? "teachers" : "students";

  try {
    const dbUser = await db.get(
      `SELECT * FROM ${table} INNER JOIN users ON ${table}.user_id = users.user_id WHERE users.username = ? AND users.password = ?`,
      [name, password]
    );
    if (!dbUser) {
      return res.status(400).json({ error: "Invalid Username or Password" });
    }
    return res.json({ message: "Login success!" });
  } catch (err) {
    return res.status(500).json({ error: "Database error" });
  }
});

// Get all teachers
app.get("/teachers", async (req, res) => {
  try {
    const selectQuery = `SELECT * FROM teachers`;
    const response = await db.all(selectQuery);
    res.json(response);
    console.log(response);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve teachers" });
  }
});

// Get all students
app.get("/students", async (req, res) => {
  try {
    const selectQuery = `SELECT * FROM students`;
    const response = await db.all(selectQuery);
    res.json(response);
    console.log(response);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve students" });
  }
});


// Insert teacher route
app.post("/teachers", async (req, res) => {
  const { name, password, subject } = req.body;
  try {
    // Insert into users table
    const userResult = await db.run(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [name, password, "teacher"]
    );
    const userId = userResult.lastID;

    // Insert into teachers table
    await db.run(
      "INSERT INTO teachers (name, subject, user_id) VALUES (?, ?, ?)",
      [name, subject, userId]
    );

    res.status(201).json({ message: "Teacher created successfully!" });
  } catch (err) {
    console.error("Error inserting teacher:", err);
    res.status(500).json({ error: "Failed to create teacher" });
  }
});

// Insert student route
app.post("/students", async (req, res) => {
  const { name, password, grade } = req.body;
  try {
    // Insert into users table
    const userResult = await db.run(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [name, password, "student"]
    );
    const userId = userResult.lastID;

    // Insert into students table
    await db.run(
      "INSERT INTO students (name, grade, user_id) VALUES (?, ?, ?)",
      [name, grade, userId]
    );

    res.status(201).json({ message: "Student created successfully!" });
  } catch (err) {
    console.error("Error inserting student:", err);
    res.status(500).json({ error: "Failed to create student" });
  }
});
module.exports = app;

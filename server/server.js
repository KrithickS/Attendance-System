const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Create MySQL connection with promise support
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
}).promise();

// Initialize database and create tables
const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');

    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table ready');

    // Create students table
    await db.query(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        regno VARCHAR(50) NOT NULL UNIQUE,
        attendance_percentage DECIMAL(5,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_regno (regno)
      )
    `);
    console.log('Students table ready');

    // Create attendance_records table
    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        date DATE NOT NULL,
        status ENUM('present', 'absent') NOT NULL DEFAULT 'absent',
        marked_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (marked_by) REFERENCES users(id),
        UNIQUE KEY unique_attendance (student_id, date)
      )
    `);
    console.log('Attendance records table ready');

  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Sign Up endpoint
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if email exists
    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error in signup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign In endpoint
app.post('/api/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ 
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error in signin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all students
// Update the students endpoint to handle date parameter
app.get('/api/students', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const [students] = await db.query(`
      SELECT 
        s.id,
        s.name,
        s.regno,
        CAST(s.attendance_percentage AS DECIMAL(5,2)) as attendance_percentage,
        COALESCE(
          (SELECT status 
           FROM attendance_records 
           WHERE student_id = s.id 
           AND date = ?
           LIMIT 1), 
          'absent'
        ) as today_status
      FROM students s
      ORDER BY s.name
    `, [date]);
    
    const formattedResults = students.map(student => ({
      ...student,
      attendance_percentage: parseFloat(student.attendance_percentage) || 0.0
    }));
    
    res.json(formattedResults);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new student
app.post('/api/students', async (req, res) => {
  try {
    const { name, regno } = req.body;

    const [existing] = await db.query('SELECT id FROM students WHERE regno = ?', [regno]);
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Registration number already exists' });
    }

    const [result] = await db.query(
      'INSERT INTO students (name, regno, attendance_percentage) VALUES (?, ?, 0.0)',
      [name, regno]
    );

    res.status(201).json({ 
      message: 'Student added successfully',
      student: { 
        id: result.insertId, 
        name, 
        regno,
        attendance_percentage: 0.0,
        today_status: 'absent'
      }
    });
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark attendance
app.post('/api/attendance', async (req, res) => {
  try {
    const { studentId, date, status, userId } = req.body;

    if (!studentId || !date || !status || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if student exists
    const [students] = await db.query('SELECT id FROM students WHERE id = ?', [studentId]);
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if user exists
    const [users] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Invalid user ID' });
    }

    // Mark attendance
    await db.query(`
      INSERT INTO attendance_records (student_id, date, status, marked_by)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)
    `, [studentId, date, status, userId]);

    // Update attendance percentage
    await db.query(`
      UPDATE students s
      SET attendance_percentage = (
        SELECT COALESCE((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 0)
        FROM attendance_records
        WHERE student_id = ?
      )
      WHERE id = ?
    `, [studentId, studentId]);

    // Get updated student data
    const [updatedStudent] = await db.query(`
      SELECT 
        s.id,
        s.name,
        s.regno,
        s.attendance_percentage,
        COALESCE(
          (SELECT status 
           FROM attendance_records 
           WHERE student_id = s.id 
           AND date = ?
           LIMIT 1),
          'absent'
        ) as today_status
      FROM students s
      WHERE s.id = ?
    `, [date, studentId]);

    res.json({
      message: 'Attendance marked successfully',
      student: updatedStudent[0]
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance report
app.get('/api/attendance/report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const [results] = await db.query(`
      SELECT 
        s.name,
        s.regno,
        s.attendance_percentage,
        COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_days
      FROM students s
      LEFT JOIN attendance_records ar ON s.id = ar.student_id
      WHERE (ar.date BETWEEN ? AND ?) OR ar.date IS NULL
      GROUP BY s.id, s.name, s.regno, s.attendance_percentage
      ORDER BY s.name
    `, [startDate, endDate]);

    res.json(results);
  } catch (error) {
    console.error('Error getting attendance report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.query('DELETE FROM students WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the application
const startServer = async () => {
  try {
    await initializeDatabase();
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.info('SIGTERM signal received.');
  try {
    await db.end();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

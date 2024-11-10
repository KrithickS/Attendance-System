# Attendance Management System 📚✅

A modern web-based solution for managing student attendance efficiently and effectively.

## 🌟 Features

- User Authentication and Authorization
- Student Management System
- Real-time Attendance Tracking
- Automated Attendance Percentage Calculation
- Interactive Dashboard
- Statistical Reports
- Responsive Design

## 🛠️ Tech Stack

### Frontend
- React.js
- Material-UI
- Context API
- React Router
- Recharts for visualization

### Backend
- Node.js
- Express.js
- MySQL
- JWT Authentication
- bcrypt for password hashing

## 🚀 Getting Started

### Prerequisites
```bash
# Required on your system
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm (v6 or higher)
```

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/attendance-management-system.git
cd attendance-management-system
```

2. Install dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

3. Configure Environment Variables

Create `.env` file in server directory:
```env
DB_HOST=localhost
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_DATABASE=auth_db
PORT=5000
JWT_SECRET=your_jwt_secret
```

Create `.env` file in client directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Initialize Database
```bash
# Log into MySQL and create database
mysql -u root -p
CREATE DATABASE auth_db;
```

5. Start the Application
```bash
# Start backend server (from server directory)
npm start

# Start frontend development server (from client directory)
npm start
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
attendance-system/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── shared-theme/
│   └── public/
└── server/
    ├── config/
    ├── routes/
    ├── middleware/
    └── utils/
```

## 🔥 Usage

1. Sign up as a new user
2. Log in to the system
3. Add students to the system
4. Mark and manage attendance
5. View statistics and reports

## 📊 API Endpoints

### Authentication
- POST `/api/signup` - Register new user
- POST `/api/signin` - User login

### Students
- GET `/api/students` - Get all students
- POST `/api/students` - Add new student
- DELETE `/api/students/:id` - Delete student

### Attendance
- POST `/api/attendance` - Mark attendance
- GET `/api/attendance/report` - Get attendance report

## 🔒 Security Features

- Password Hashing
- JWT Authentication
- Input Validation
- SQL Injection Prevention
- XSS Protection
- Rate Limiting

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to the branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## 👥 Authors

- **Krithick S** - *Initial work* - [KrithickS](https://github.com/KrithickS)

## 🙏 Acknowledgments

- Material-UI for the awesome component library
- React team for the amazing framework
- Node.js community for the excellent backend runtime
- All contributors who participated in this project

## 📞 Support

For support, email krithick2004@gmail or create an issue in the repository.

## 🔮 Future Updates

- Mobile Application
- Advanced Analytics
- Email Notifications
- Multiple User Roles
- Automated Reports
- Biometric Integration

---
⭐️ Star this repo if you find it helpful!

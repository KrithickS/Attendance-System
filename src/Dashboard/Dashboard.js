import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  AppBar,
  Toolbar,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    averageAttendance: 0
  });
  const [newStudent, setNewStudent] = useState({
    name: '',
    regno: ''
  });

  // Check for authentication
  // At the top of your Dashboard component
useEffect(() => {
    const checkAuth = async () => {
      const savedUser = localStorage.getItem('user');
      console.log('Saved user data:', savedUser); // Debug log
  
      if (!savedUser) {
        console.log('No user data found, redirecting to login');
        navigate('/signin');
        return;
      }
  
      try {
        const userData = JSON.parse(savedUser);
        if (!userData || !userData.id) {
          console.log('Invalid user data, redirecting to login');
          navigate('/signin');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/signin');
      }
    };
  
    checkAuth();
  }, [navigate]);

  const updateStats = useCallback((studentData) => {
    if (!Array.isArray(studentData) || studentData.length === 0) {
      setStats({
        totalStudents: 0,
        presentToday: 0,
        averageAttendance: 0
      });
      return;
    }

    const total = studentData.length;
    const present = studentData.filter(s => s.today_status === 'present').length;
    const avgAttendance = studentData.reduce((acc, curr) => {
      const attendance = parseFloat(curr.attendance_percentage) || 0;
      return acc + attendance;
    }, 0) / total;

    setStats({
      totalStudents: total,
      presentToday: present,
      averageAttendance: avgAttendance
    });
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('http://localhost:5000/api/students');
      const data = await response.json();
      
      if (response.ok) {
        setStudents(data);
        updateStats(data);
      } else {
        setError('Failed to fetch students');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }, [updateStats]);

  const handleAttendanceToggle = useCallback(async (studentId, currentStatus) => {
    console.log('Current user:', user); // Debug log
    
    if (!user || !user.id) {
      console.error('No user ID found:', user);
      setError('Authentication error. Please try signing in again.');
      return;
    }
  
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    
    try {
      setMarkingAttendance(true);
      setError('');
      
      const attendanceData = {
        studentId,
        date: new Date().toISOString().split('T')[0],
        status: newStatus,
        userId: user.id
      };
  
      console.log('Sending attendance data:', attendanceData);
  
      const response = await fetch('http://localhost:5000/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        setStudents(prevStudents => 
          prevStudents.map(student => 
            student.id === studentId 
              ? { ...student, today_status: newStatus }
              : student
          )
        );
        setSuccess(`Attendance marked as ${newStatus}`);
        await fetchStudents(); // Refresh data
      } else {
        console.error('Attendance update failed:', data);
        setError(data.error || 'Failed to update attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      setError('Failed to update attendance. Please try again.');
    } finally {
      setMarkingAttendance(false);
    }
  }, [user, fetchStudents, setError, setSuccess, setMarkingAttendance]);

  const handleAddStudent = useCallback(async () => {
    if (!newStudent.name || !newStudent.regno) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStudent),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Student added successfully');
        setOpenDialog(false);
        fetchStudents();
        setNewStudent({ name: '', regno: '' });
      } else {
        setError(data.error || 'Failed to add student');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to add student');
    }
  }, [newStudent, fetchStudents]);

  useEffect(() => {
    if (user) {
      fetchStudents();
    }
  }, [user, fetchStudents]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/signin');
  }, [logout, navigate]);

  const renderAttendanceButton = useCallback((student) => (
    <IconButton
      onClick={() => handleAttendanceToggle(student.id, student.today_status)}
      color={student.today_status === 'present' ? 'success' : 'error'}
      disabled={markingAttendance}
      size="large"
    >
      {student.today_status === 'present' ? <CheckIcon /> : <CloseIcon />}
    </IconButton>
  ), [handleAttendanceToggle, markingAttendance]);

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (loading && students.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Attendance Management System
          </Typography>
          <Typography sx={{ mr: 2 }}>Welcome, {user?.name}</Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Students
                </Typography>
                <Typography variant="h4">
                  {stats.totalStudents}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Present Today
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.presentToday}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {stats.totalStudents > 0 
                    ? `(${((stats.presentToday / stats.totalStudents) * 100).toFixed(1)}%)`
                    : '(0%)'
                  }
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Average Attendance
                </Typography>
                <Typography variant="h4">
                  {stats.averageAttendance.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Students Table */}
        <Paper sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Students</Typography>
            <Box>
              <IconButton onClick={fetchStudents} sx={{ mr: 1 }}>
                <RefreshIcon />
              </IconButton>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
              >
                Add Student
              </Button>
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reg No</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="center">Today's Status</TableCell>
                  <TableCell align="center">Attendance %</TableCell>
                  <TableCell align="center">Mark Attendance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No students found. Add some students to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.regno}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell align="center">
                        <Typography
                          color={student.today_status === 'present' ? 'success.main' : 'error.main'}
                        >
                          {student.today_status?.toUpperCase() || 'ABSENT'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {typeof student.attendance_percentage === 'number' 
                          ? `${student.attendance_percentage.toFixed(1)}%`
                          : '0.0%'
                        }
                      </TableCell>
                      <TableCell align="center">
                        {renderAttendanceButton(student)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>

      {/* Add Student Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Add New Student</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={newStudent.name}
              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
              error={!newStudent.name && error}
              helperText={!newStudent.name && error ? 'Name is required' : ''}
            />
            <TextField
              fullWidth
              label="Registration Number"
              value={newStudent.regno}
              onChange={(e) => setNewStudent({ ...newStudent, regno: e.target.value })}
              error={!newStudent.regno && error}
              helperText={!newStudent.regno && error ? 'Registration number is required' : ''}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddStudent} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
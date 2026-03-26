import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import GroupList from './pages/groups/GroupList';
import CreateGroup from './pages/groups/CreateGroup';
import GroupDetail from './pages/groups/GroupDetail';
import GroupJoin from './pages/groups/GroupJoin';
import AssignmentList from './pages/assignments/AssignmentList';
import CreateAssignment from './pages/assignments/CreateAssignment';
import AssignmentEdit from './pages/assignments/AssignmentEdit';
import TutorsPage from './pages/tutors/TutorsPage';
import MyAvailability from './pages/tutors/MyAvailability';
import TutorSelectionPage from './pages/tutors/TutorSelectionPage';

import MeetingList from './pages/meetings/MeetingList';
import MeetingRoom from './pages/meetings/MeetingRoom';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProfilePage from './pages/profile/ProfilePage';
import MessagingPage from './pages/messaging/MessagingPage';
import AIChatPage from './pages/ai-assistant/AIChatPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="groups" element={<ProtectedRoute requireVerified><GroupList /></ProtectedRoute>} />
        <Route path="groups/join" element={<ProtectedRoute requireVerified><GroupJoin /></ProtectedRoute>} />
        <Route path="groups/new" element={<ProtectedRoute requireVerified roles={['student', 'tutor']}><CreateGroup /></ProtectedRoute>} />
        <Route path="groups/:id" element={<ProtectedRoute requireVerified><GroupDetail /></ProtectedRoute>} />
        <Route path="assignments" element={<ProtectedRoute requireVerified><AssignmentList /></ProtectedRoute>} />
        <Route path="assignments/new" element={<ProtectedRoute requireVerified><CreateAssignment /></ProtectedRoute>} />
        <Route path="assignments/:id" element={<ProtectedRoute requireVerified><AssignmentEdit /></ProtectedRoute>} />
        <Route path="tutors" element={<ProtectedRoute requireVerified><TutorsPage /></ProtectedRoute>} />
        <Route path="my-availability" element={<ProtectedRoute requireVerified roles={['tutor']}><MyAvailability /></ProtectedRoute>} />
        <Route path="tutors/select" element={<ProtectedRoute requireVerified><TutorSelectionPage /></ProtectedRoute>} />
        <Route path="meetings" element={<ProtectedRoute requireVerified><MeetingList /></ProtectedRoute>} />
        <Route path="meetings/:id" element={<ProtectedRoute requireVerified><MeetingRoom /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute requireVerified roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute requireVerified><ProfilePage /></ProtectedRoute>} />
        <Route path="messages" element={<ProtectedRoute requireVerified><MessagingPage /></ProtectedRoute>} />
        <Route path="ai-assistant" element={<ProtectedRoute requireVerified><AIChatPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

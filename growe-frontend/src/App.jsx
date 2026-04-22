import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import RouteLoader from './components/ui/RouteLoader';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const CompleteProfile = lazy(() => import('./pages/auth/CompleteProfile'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const GroupList = lazy(() => import('./pages/groups/GroupList'));
const CreateGroup = lazy(() => import('./pages/groups/CreateGroup'));
const GroupDetail = lazy(() => import('./pages/groups/GroupDetail'));
const GroupJoin = lazy(() => import('./pages/groups/GroupJoin'));
const FocusRoom = lazy(() => import('./pages/groups/FocusRoom'));
const AssignmentList = lazy(() => import('./pages/assignments/AssignmentList'));
const CreateAssignment = lazy(() => import('./pages/assignments/CreateAssignment'));
const AssignmentEdit = lazy(() => import('./pages/assignments/AssignmentEdit'));
const TutorsPage = lazy(() => import('./pages/tutors/TutorsPage'));
const MyAvailability = lazy(() => import('./pages/tutors/MyAvailability'));
const TutorSelectionPage = lazy(() => import('./pages/tutors/TutorSelectionPage'));
const MeetingList = lazy(() => import('./pages/meetings/MeetingList'));
const MeetingRoom = lazy(() => import('./pages/meetings/MeetingRoom'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const MessagingPage = lazy(() => import('./pages/messaging/MessagingPage'));
const AIChatPage = lazy(() => import('./pages/ai-assistant/AIChatPage'));
const AiFlashcards = lazy(() => import('./pages/ai-assistant/AiFlashcards'));

function App() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute requireVerified skipProfileComplete>
              <CompleteProfile />
            </ProtectedRoute>
          }
        />
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
          <Route path="groups/new" element={<ProtectedRoute requireVerified><CreateGroup /></ProtectedRoute>} />
          <Route path="groups/:id" element={<ProtectedRoute requireVerified><GroupDetail /></ProtectedRoute>} />
          <Route path="groups/:id/focus" element={<ProtectedRoute requireVerified><FocusRoom /></ProtectedRoute>} />
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
          <Route path="ai-flashcards" element={<ProtectedRoute requireVerified><AiFlashcards /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;

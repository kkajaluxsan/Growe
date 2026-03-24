import { useAuth } from '../../context/AuthContext';
import TutorDashboard from './TutorDashboard';
import TutorList from './TutorList';

export default function TutorsPage() {
  const { user } = useAuth();

  if (user?.roleName === 'tutor') {
    return <TutorDashboard />;
  }

  return <TutorList />;
}

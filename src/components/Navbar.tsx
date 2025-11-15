import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { User as UserIcon, LogOut, BarChart3 } from 'lucide-react';
import { User } from '../services/api';

interface NavbarProps {
  user?: User | null;
  onLogout?: () => Promise<void> | void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    }
    navigate('/login');
  };

  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-purple-600" />
          <span className="text-purple-600">Study Timer</span>
        </Link>
        
        {user && (
          <div className="flex items-center gap-4">
            <Link to={`/profile/${user.id}`}>
              <Button variant="ghost" size="sm">
                <UserIcon className="w-4 h-4 mr-2" />
                {user.nickname || user.name || user.email}
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}

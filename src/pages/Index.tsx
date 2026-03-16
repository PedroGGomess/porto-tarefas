import { useAuth } from '@/hooks/useAuth';
import Login from './Login';
import Dashboard from './Dashboard';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm animate-pulse">A carregar...</div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
};

export default Index;

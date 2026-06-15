import { Modal } from '@/components/ui';
import { User, Mail, ShieldCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';

export function UserProfileModal({ open, onClose, user }: { open: boolean, onClose: () => void, user: any }) {
  if (!user) return null;

  return (
    <Modal open={open} onClose={onClose} title="User Profile" maxWidth="max-w-md">
      <div className="flex flex-col items-center py-6">
        <div className="w-24 h-24 rounded-full bg-brand-indigo/10 flex items-center justify-center mb-4 border-2 border-brand-indigo/20">
          <User className="w-12 h-12 text-brand-indigo" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">{user.full_name}</h2>
        <p className="text-brand-indigo-light font-mono text-sm">{user.email}</p>
        
        <div className="w-full mt-8 space-y-4">
          <div className="flex justify-between p-3 bg-bg-secondary rounded-lg border border-bg-border">
            <span className="text-text-muted text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Role</span>
            <span className="text-text-primary font-bold text-sm">{user.is_admin ? 'Administrator' : 'Standard User'}</span>
          </div>
          <div className="flex justify-between p-3 bg-bg-secondary rounded-lg border border-bg-border">
            <span className="text-text-muted text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Member Since</span>
            <span className="text-text-primary font-bold text-sm">{format(new Date(user.created_at), 'MMM dd, yyyy')}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
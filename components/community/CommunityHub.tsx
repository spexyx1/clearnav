import { useState } from 'react';
import { MessageSquare, Mail as MailIcon, Users, User, Bell } from 'lucide-react';
import CommunityFeed from './CommunityFeed';
import DirectMessaging from './DirectMessaging';
import UserNetwork from './UserNetwork';
import NotificationCenter from './NotificationCenter';

type TabType = 'feed' | 'messages' | 'network' | 'notifications';

export default function CommunityHub() {
  const [activeTab, setActiveTab] = useState<TabType>('feed');

  const tabs = [
    { id: 'feed' as TabType, name: 'Community Feed', icon: MessageSquare },
    { id: 'messages' as TabType, name: 'Messages', icon: MailIcon },
    { id: 'network' as TabType, name: 'Network', icon: Users },
    { id: 'notifications' as TabType, name: 'Notifications', icon: Bell }
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 flex items-center gap-2 font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'feed' && <CommunityFeed />}
        {activeTab === 'messages' && <DirectMessaging />}
        {activeTab === 'network' && <UserNetwork />}
        {activeTab === 'notifications' && <NotificationCenter />}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Bell, CheckCircle, AlertCircle, MessageSquare, Trash2 } from 'lucide-react';

function NotificationsList() {
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Task Completed',
      message: 'EVE-Assistant has completed the data analysis task.',
      time: '5 minutes ago',
      type: 'success',
      read: false
    },
    {
      id: '2',
      title: 'Approval Required',
      message: 'EVE-Finance needs your approval for a payment action.',
      time: '1 hour ago',
      type: 'warning',
      read: false
    },
    {
      id: '3',
      title: 'Collaboration Request',
      message: 'EVE-Marketing has requested assistance from EVE-Content for social media posts.',
      time: '3 hours ago',
      type: 'info',
      read: true
    },
    {
      id: '4',
      title: 'Error Detected',
      message: 'EVE-Support encountered an error processing customer ticket #12345.',
      time: '1 day ago',
      type: 'error',
      read: true
    }
  ]);

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(notification => notification.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-success" />;
      case 'warning':
        return <AlertCircle size={20} className="text-warning" />;
      case 'error':
        return <AlertCircle size={20} className="text-error" />;
      case 'info':
        return <MessageSquare size={20} className="text-info" />;
      default:
        return <Bell size={20} className="text-gray-400" />;
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 pt-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400">View and manage system notifications and alerts</p>
        </div>
        <button 
          onClick={markAllAsRead}
          className="inline-flex items-center bg-black hover:bg-black/90 text-primary font-medium py-2 px-4 rounded-md border border-primary hover:shadow-neon"
        >
          <CheckCircle size={16} className="mr-2" />
          Mark All as Read
        </button>
      </div>
      
      <div className="bg-dark-surface rounded-lg shadow-md border border-dark-border overflow-hidden mb-6">
        <div className="p-4 border-b border-dark-border flex justify-between items-center">
          <h2 className="font-semibold text-white">All Notifications</h2>
          <div className="text-sm text-gray-400">
            {notifications.filter(n => !n.read).length} unread
          </div>
        </div>
        
        {notifications.length > 0 ? (
          <div>
            {notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`p-4 border-b border-dark-border last:border-b-0 hover:bg-black/20 flex items-start ${
                  !notification.read ? 'bg-black/10' : ''
                }`}
              >
                <div className="mr-3 mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className={`font-medium ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-gray-500">{notification.time}</span>
                  </div>
                  <p className={`mt-1 text-sm ${!notification.read ? 'text-gray-300' : 'text-gray-400'}`}>
                    {notification.message}
                  </p>
                </div>
                <div className="flex space-x-2 ml-4">
                  {!notification.read && (
                    <button 
                      onClick={() => markAsRead(notification.id)} 
                      className="text-primary hover:text-primary/80"
                      title="Mark as read"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => deleteNotification(notification.id)} 
                    className="text-gray-400 hover:text-error"
                    title="Delete notification"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Bell size={24} className="mx-auto text-gray-500 mb-3" />
            <p className="text-gray-400">No notifications found</p>
            <p className="text-gray-500 text-sm mt-1">
              When you receive notifications, they will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsList;
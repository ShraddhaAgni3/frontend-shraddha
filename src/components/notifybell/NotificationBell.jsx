 

// components/NotificationBell.jsx - FINAL FIX (Only one change)
import React, { useState, useEffect, useRef } from "react";
import { adminAPI } from "../services/adminApi";
import { chatApi } from "../services/chatApi";
import { FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const getUserId = () => {
    try {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        return userData.user_id || userData.id;
      }
    } catch (error) {}
    
    const userId = localStorage.getItem("user_id") || localStorage.getItem("userId");
    if (userId) return userId;
    
    return "62";
  };

  const extractSenderInfo = (notification) => {
    let senderId = null;
    let senderName = "User";
    
    if (notification.sender_name) {
      senderName = notification.sender_name;
      senderId = notification.sender_id;
    }
    else if (notification.from_user_name) {
      senderName = notification.from_user_name;
      senderId = notification.from_user_id;
    }
    else if (notification.metadata) {
      try {
        const metadata = typeof notification.metadata === 'string' 
          ? JSON.parse(notification.metadata) 
          : notification.metadata;
        senderId = metadata.sender_id || metadata.user_id;
        senderName = metadata.sender_name || metadata.name || "User";
      } catch (error) {}
    }
    else {
      const message = notification.message || notification.content || "";
      if (message.includes("sent you a new message")) {
        const match = message.match(/^(.*?)\s+sent you a new message/);
        if (match && match[1]) {
          senderName = match[1].trim();
        }
      }
    }
    
    return { senderId, senderName };
  };

  const cleanUserName = (name) => {
    if (!name) return "User";
    return name.replace(/\d+$/, "").trim() || name;
  };

  const extractReactionEmoji = (notification) => {
    const message = notification.message || notification.content || "";
    if (message.includes("❤️")) return "❤️";
    if (message.includes("😂")) return "😂";
    if (message.includes("👍")) return "👍";
    if (message.includes("🔥")) return "🔥";
    return "❤️";
  };

  // ✅ FIXED: Only show type:null for ADMIN notifications
  const fetchNotifications = async () => {
    const userId = getUserId();
    
    if (!userId) return;

    try {
      setLoading(true);
      
      let userNotifications = [];
      let adminNotifications = [];
      
      // 1. CHAT NOTIFICATIONS (User Messages)
      try {
        const response = await chatApi.getUserNotifications(userId);
        
        if (response.data) {
          let chatNotifs = [];
          
          if (Array.isArray(response.data)) {
            chatNotifs = response.data;
          } else if (response.data.notifications && Array.isArray(response.data.notifications)) {
            chatNotifs = response.data.notifications;
          } else if (response.data.messages && Array.isArray(response.data.messages)) {
            chatNotifs = response.data.messages;
          }
          
          // 🔥 FILTER: Sirf type: "Message" ya "reaction" wale rakho
          chatNotifs = chatNotifs.filter(notif => {
            // Admin ke messages mat dikhao
            if (notif.type === null) return false; // 👈 YAHI MAIN FIX
            if (notif.title === "Account Approved" || notif.title === "Account On Hold") return false;
            
            return true;
          });
          
          const formattedChatNotifs = chatNotifs.map(notif => {
            const { senderId, senderName } = extractSenderInfo(notif);
            const isReaction = notif.type === "reaction" || (notif.message || "").includes("reacted");
            
            return {
              id: notif.id,
              type: isReaction ? 'reaction' : 'user',
              source: 'user',
              sender_id: senderId || notif.sender_id || notif.from_user_id,
              sender_name: cleanUserName(senderName),
              message: notif.message || notif.content || "sent you a message",
              created_at: notif.created_at || notif.timestamp,
              is_read: notif.is_read || false,
              is_reaction: isReaction,
              reaction_emoji: isReaction ? extractReactionEmoji(notif) : null
            };
          });
          
          userNotifications = [...userNotifications, ...formattedChatNotifs];
        }
      } catch (chatError) {}

      // 2. ADMIN NOTIFICATIONS (type: null wale)
      try {
        const adminResponse = await chatApi.getUserNotifications(userId); // Same API se
        
        if (adminResponse.data && Array.isArray(adminResponse.data)) {
          const adminMsgs = adminResponse.data.filter(notif => 
            notif.type === null || // 👈 YAHI SE ADMIN NOTIFICATIONS AAYENGE
            notif.title === "Account Approved" || 
            notif.title === "Account On Hold"
          );
          
          const formattedAdminNotifs = adminMsgs.map(notif => ({
            id: notif.id,
            type: 'admin',
            source: 'admin',
            sender_name: "Admin",
            message: notif.message || notif.content || "System notification",
            created_at: notif.created_at || notif.timestamp,
            is_read: true, // Admin always read
            title: notif.title || "Admin Notification"
          }));
          
          adminNotifications = formattedAdminNotifs;
        }
      } catch (adminError) {}
      
      // Combine both
      const allNotifications = [...adminNotifications, ...userNotifications]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setNotifications(allNotifications);
      
      // Count unread (only user messages)
      const unread = userNotifications.filter(n => !n.is_read).length;
      setUnreadCount(unread);
      
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notification) => {
    if (notification.source === 'admin') return;
    
    try {
      await chatApi.markNotificationAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {}
  };

  const handleNotificationClick = (notification) => {
    if (notification.source === 'admin') {
      console.log("Admin notification - no action");
      return;
    }
    
    markAsRead(notification);
    
    if (notification.sender_id) {
      navigate("/dashboard/messages", {
        state: {
          selectedUser: {
            id: notification.sender_id,
            name: notification.sender_name
          }
        }
      });
    } else {
      navigate("/dashboard/messages");
    }
    
    setShowDropdown(false);
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => n.source !== 'admin' ? { ...n, is_read: true } : n)
    );
    setUnreadCount(0);
  };

  const toggleDropdown = () => {
    if (!showDropdown) {
      fetchNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "Just now";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMins = Math.floor((now - date) / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* BELL ICON */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-600 hover:text-amber-600 transition-colors"
      >
        <FaBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* HEADER */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-sm text-amber-600">
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* WELCOME MESSAGE */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 border-b border-gray-200">
            <p className="font-medium text-gray-800">Welcome back, imran!</p>
            <p className="text-sm text-gray-600">Ready to find your perfect match?</p>
          </div>

          {/* NOTIFICATIONS LIST */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">🔔</div>
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div
                  key={notification.id || index}
                  className={`
                    p-4 border-b border-gray-100 transition
                    ${notification.source === 'admin' 
                      ? 'bg-gray-50 cursor-default hover:bg-gray-50' 
                      : 'cursor-pointer hover:bg-amber-50'
                    }
                    ${!notification.is_read && notification.source !== 'admin' ? 'bg-amber-50' : ''}
                  `}
                  onClick={() => {
                    if (notification.source !== 'admin') {
                      handleNotificationClick(notification);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* ICON */}
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-lg
                      ${notification.source === 'admin' 
                        ? 'bg-purple-100 text-purple-600'
                        : notification.is_reaction
                        ? 'bg-pink-100 text-pink-600'
                        : 'bg-blue-100 text-blue-600'
                      }
                    `}>
                      {notification.source === 'admin' ? '👨‍💼' : 
                       notification.is_reaction ? (notification.reaction_emoji || '❤️') : '💬'}
                    </div>
                    
                    {/* CONTENT */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-gray-800">
                          {notification.source === 'admin' 
                            ? notification.title || 'Admin Notification'
                            : notification.sender_name || 'User'
                          }
                        </h4>
                        <span className="text-xs text-gray-500">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        {notification.source === 'admin' ? (
                          <>
                            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                              Admin
                            </span>
                            <span className="text-xs text-gray-400">🔒 Read only</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                              {notification.is_reaction ? 'Reaction' : 'Message'}
                            </span>
                            {!notification.is_read && (
                              <span className="text-xs text-amber-600">● New</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* FOOTER */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <button
              onClick={fetchNotifications}
              className="w-full text-sm text-gray-600 hover:text-amber-600 font-medium py-2"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;















































































































































































































// // components/NotificationBell.jsx - FIXED SIMPLE VERSION
// import React, { useState, useEffect, useRef } from "react";
// import { adminAPI } from "../services/adminApi";
// import { chatApi } from "../services/chatApi";
// import { FaBell } from "react-icons/fa";
// import { useNavigate } from "react-router-dom";

// const NotificationBell = () => {
//   const [notifications, setNotifications] = useState([]);
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [unreadCount, setUnreadCount] = useState(0);
//   const dropdownRef = useRef(null);
//   const navigate = useNavigate();

//   //  Get User ID 
//   const getUserId = () => {
//     // Method 1: currentUser स
//     try {
//       const storedUser = localStorage.getItem("currentUser");
//       if (storedUser) {
//         const userData = JSON.parse(storedUser);
//         console.log("✅ Found currentUser:", userData);
//         return userData.user_id || userData.id;
//       }
//     } catch (error) {
//       console.log("❌ Error parsing currentUser:", error);
//     }
    
//     // Method 2: Direct localStorage से
//     const userId = localStorage.getItem("user_id") || localStorage.getItem("userId");
//     if (userId) {
//       console.log("✅ Found user_id in localStorage:", userId);
//       return userId;
//     }
    
//     // Method 3: user object से
//     try {
//       const userData = JSON.parse(localStorage.getItem("user") || "{}");
//       if (userData.id || userData.user_id) {
//         console.log("✅ Found in user object:", userData.id || userData.user_id);
//         return userData.id || userData.user_id;
//       }
//     } catch (error) {
//       console.log("❌ Error parsing user data:", error);
//     }
    
//     console.log("⚠️ Using default user ID: 62");
//     return "62";
//   };

//   // ✅ Extract sender name - SIMPLE LOGIC
//   const extractSenderInfo = (notification) => {
//     let senderId = null;
//     let senderName = "User";
    
//     console.log("🔍 Extracting from notification:", notification);

//     // TRY 1: Check if name is directly available
//     if (notification.sender_name) {
//       senderName = notification.sender_name;
//       senderId = notification.sender_id;
//       console.log("✅ Direct sender_name found:", senderName);
//     }
    
//     // TRY 2: Check from_user fields
//     else if (notification.from_user_name) {
//       senderName = notification.from_user_name;
//       senderId = notification.from_user_id;
//       console.log("✅ from_user_name found:", senderName);
//     }
    
//     // TRY 3: Check metadata
//     else if (notification.metadata) {
//       try {
//         const metadata = typeof notification.metadata === 'string' 
//           ? JSON.parse(notification.metadata) 
//           : notification.metadata;
        
//         console.log("📋 Metadata:", metadata);
        
//         senderId = metadata.sender_id || metadata.user_id || metadata.from_user_id;
//         senderName = metadata.sender_name || metadata.name || metadata.username || "User";
        
//         console.log("✅ From metadata - ID:", senderId, "Name:", senderName);
//       } catch (error) {
//         console.log("❌ Error parsing metadata:", error);
//       }
//     }
    
//     // TRY 4: Extract from message
//     else {
//       const message = notification.message || notification.content || "";
//       console.log("📝 Message content:", message);
      
//       if (message.includes("sent you a new message")) {
//         const match = message.match(/^(.*?)\s+sent you a new message/);
//         if (match && match[1]) {
//           senderName = match[1].trim();
//           console.log("✅ Extracted from message:", senderName);
//         }
//       }
//     }
    
//     return { senderId, senderName };
//   };

//   // ✅ Format name function (from your messages code)
//   const cleanUserName = (name) => {
//     if (!name) return "User";
//     // Remove numbers from the end
//     return name.replace(/\d+$/, "").trim() || name;
//   };

//   // ✅ Fetch Notifications - FIXED VERSION
//   const fetchNotifications = async () => {
//     const userId = getUserId();
//     console.log("🔄 Fetching notifications for user:", userId);
    
//     if (!userId) {
//       console.error("❌ No user ID found");
//       return;
//     }

//     try {
//       setLoading(true);
//       setNotifications([]); // Clear previous
      
//       let allNotifications = [];
      
//       // 1. CHAT NOTIFICATIONS
//       try {
//         console.log("📡 Calling chatApi.getUserNotifications...");
//         const response = await chatApi.getUserNotifications(userId);
//         console.log("✅ chatApi response:", response.data);
        
//         if (response.data) {
//           let chatNotifs = [];
          
//           if (Array.isArray(response.data)) {
//             chatNotifs = response.data;
//           } else if (response.data.notifications && Array.isArray(response.data.notifications)) {
//             chatNotifs = response.data.notifications;
//           } else if (response.data.messages && Array.isArray(response.data.messages)) {
//             chatNotifs = response.data.messages;
//           }
          
//           console.log(`📥 Found ${chatNotifs.length} chat notifications`);
          
//           // Process each notification
//           const formattedChatNotifs = chatNotifs.map(notif => {
//             const { senderId, senderName } = extractSenderInfo(notif);
            
//             // Check if it's a reaction
//             const isReaction = (notif.message || notif.content || "").includes("reacted");
            
//             return {
//               ...notif,
//               source: 'chat',
//               type: isReaction ? 'reaction' : 'message',
//               sender_id: senderId || notif.sender_id || notif.from_user_id,
//               sender_name: cleanUserName(senderName),
//               is_reaction: isReaction,
//               // For reaction, extract emoji
//               reaction_emoji: isReaction ? extractReactionEmoji(notif) : null
//             };
//           });
          
//           allNotifications = [...allNotifications, ...formattedChatNotifs];
//         }
//       } catch (chatError) {
//         console.log("❌ chatApi error:", chatError);
//       }

      
//       // 2. ADMIN NOTIFICATIONS
//       try {
//         console.log("📡 Calling adminAPI.getUserNotifications...");
//         const adminResponse = await adminAPI.getUserNotifications(userId);
//         console.log("✅ adminAPI response:", adminResponse.data);
        
//         if (adminResponse.data && Array.isArray(adminResponse.data)) {
//           const adminNotifs = adminResponse.data.map(notif => ({
//             ...notif,
//             source: 'admin',
//             type: 'admin_notification',
//             sender_name: "Admin",
//             is_admin: true
//           }));
//           allNotifications = [...allNotifications, ...adminNotifs];
//         }
//       } catch (adminError) {
//         console.log("❌ adminAPI error:", adminError);
//       }
      
//       // Sort by date (newest first)
//       const sortedNotifications = allNotifications.sort((a, b) => {
//         const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
//         const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
//         return dateB - dateA;
//       });
      
//       console.log("🎯 Final notifications:", sortedNotifications);
//       setNotifications(sortedNotifications);
      
//       // Count unread
//       const unread = sortedNotifications.filter(n => !n.is_read).length;
//       setUnreadCount(unread);
      
//     } catch (error) {
//       console.error("❌ Error in fetchNotifications:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ✅ Extract reaction emoji
//   const extractReactionEmoji = (notification) => {
//     const message = notification.message || notification.content || "";
    
//     if (message.includes("❤️")) return "❤️";
//     if (message.includes("😂")) return "😂";
//     if (message.includes("😊")) return "😊";
//     if (message.includes("👍")) return "👍";
//     if (message.includes("🔥")) return "🔥";
    
//     return "❤️";
//   };

//   // ✅ Mark as Read
//   const markAsRead = async (notification) => {
//     try {
//       console.log("📝 Marking as read:", notification.id);
      
//       if (notification.source === 'admin') {
//         await adminAPI.markNotificationAsRead(notification.id);
//       } else {
//         await chatApi.markNotificationAsRead(notification.id);
//       }
      
//       setNotifications(prev =>
//         prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
//       );
//       setUnreadCount(prev => Math.max(0, prev - 1));
      
//     } catch (error) {
//       console.error("❌ Error marking as read:", error);
//     }
//   };

//   // ✅ Handle Notification Click - FIXED
//   const handleNotificationClick = (notification) => {
//     console.log("🖱️ Clicked notification:", notification);
    
//     // Mark as read
//     markAsRead(notification);
    
//     // ✅ FOR CHAT NOTIFICATIONS
//     if (notification.source === 'chat' && notification.sender_id) {
//       console.log("💬 Opening chat with:", notification.sender_name, "ID:", notification.sender_id);
      
//       navigate("/dashboard/messages", {
//         state: {
//           selectedUser: {
//             id: notification.sender_id,
//             name: notification.sender_name || "User",
//             receiverId: notification.sender_id
//           }
//         }
//       });
//     } 
//     // ✅ FOR ADMIN NOTIFICATIONS - NO ACTION
//     else if (notification.source === 'admin') {
//       console.log("👨‍💼 Admin notification - no action");
//       // Do nothing - just mark as read
//     }
//     // ✅ FOR REACTIONS - OPEN SPECIFIC CHAT
//     else if (notification.is_reaction && notification.sender_id) {
//       console.log("❤️ Opening chat for reaction from:", notification.sender_name);
      
//       navigate("/dashboard/messages", {
//         state: {
//           selectedUser: {
//             id: notification.sender_id,
//             name: notification.sender_name || "User",
//             receiverId: notification.sender_id
//           }
//         }
//       });
//     }
//     // Fallback
//     else {
//       console.log("📨 Opening general messages");
//       navigate("/dashboard/messages");
//     }
    
//     setShowDropdown(false);
//   };

//   // ✅ Toggle Dropdown
//   const toggleDropdown = () => {
//     if (!showDropdown) {
//       fetchNotifications();
//     }
//     setShowDropdown(!showDropdown);
//   };

//   // ✅ Close on click outside
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setShowDropdown(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // ✅ Format Date
//   const formatDate = (dateString) => {
//     if (!dateString) return "Just now";
//     try {
//       const date = new Date(dateString);
//       const now = new Date();
//       const diffMs = now - date;
//       const diffMins = Math.floor(diffMs / 60000);
      
//       if (diffMins < 1) return "Just now";
//       if (diffMins < 60) return `${diffMins}m ago`;
//       if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      
//       return date.toLocaleDateString("en-IN", {
//         day: "numeric",
//         month: "short",
//       });
//     } catch (e) {
//       return dateString;
//     }
//   };

//   return (
//     <div className="relative" ref={dropdownRef}>
//       {/* DEBUG BUTTON */}
//       <button
//         onClick={() => {
//           console.log("=== DEBUG INFO ===");
//           console.log("Current User ID:", getUserId());
//           console.log("LocalStorage user_id:", localStorage.getItem("user_id"));
//           console.log("LocalStorage currentUser:", localStorage.getItem("currentUser"));
//           console.log("LocalStorage user:", localStorage.getItem("user"));
//           console.log("Notifications count:", notifications.length);
//           notifications.forEach((n, i) => {
//             console.log(`Notification ${i}:`, {
//               id: n.id,
//               type: n.type,
//               sender_name: n.sender_name,
//               sender_id: n.sender_id,
//               source: n.source,
//               message: n.message || n.content
//             });
//           });
//         }}
//         className=" text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
//         title="Debug Info"
//       >
        
//       </button>

//       {/* BELL ICON */}
//       <button
//         onClick={toggleDropdown}
//         className="relative p-2 text-gray-600 hover:text-amber-600 transition-colors"
//         aria-label="Notifications"
//       >
//         <FaBell className="w-6 h-6" />
        
//         {unreadCount > 0 && (
//           <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
//             {unreadCount > 9 ? "9+" : unreadCount}
//           </span>
//         )}
//       </button>

//       {/* DROPDOWN */}
//       {showDropdown && (
//         <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
//           {/* HEADER */}
//           <div className="p-4 border-b border-gray-200">
//             <div className="flex justify-between items-center">
//               <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
//               <div className="flex gap-2">
//                 {unreadCount > 0 && (
//                   <button
//                     onClick={() => {
//                       notifications.forEach(notif => markAsRead(notif));
//                     }}
//                     className="text-sm text-amber-600 hover:text-amber-800 font-medium px-3 py-1 hover:bg-amber-50 rounded-lg"
//                   >
//                     Mark all read
//                   </button>
//                 )}
//                 <button
//                   onClick={fetchNotifications}
//                   className="text-sm text-gray-600 hover:text-gray-800 font-medium px-3 py-1 hover:bg-gray-100 rounded-lg"
//                 >
//                   🔄
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* NOTIFICATIONS LIST */}
//           <div className="max-h-96 overflow-y-auto">
//             {loading ? (
//               <div className="p-8 text-center">
//                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
//                 <p className="text-gray-500 mt-3 text-sm">Loading...</p>
//               </div>
//             ) : notifications.length === 0 ? (
//               <div className="p-8 text-center">
//                 <div className="text-gray-300 text-4xl mb-3">🔔</div>
//                 <p className="text-gray-500 text-sm">No notifications</p>
//                 <p className="text-gray-400 text-xs mt-1">
//                   When you get notifications, they'll appear here
//                 </p>
//               </div>
//             ) : (
//               <div className="divide-y divide-gray-100">
//                 {notifications.map((notification, index) => (
//                   <div
//                     key={notification.id || index}
//                     className={`p-4 transition-colors ${
//                       notification.source === 'admin' 
//                         ? 'cursor-default hover:bg-gray-50/50' 
//                         : 'cursor-pointer hover:bg-gray-50'
//                     } ${
//                       !notification.is_read ? "bg-amber-50" : ""
//                     }`}
//                     onClick={() => {
//                       // Only allow clicks for non-admin notifications
//                       if (notification.source !== 'admin') {
//                         handleNotificationClick(notification);
//                       }
//                     }}
//                   >
//                     <div className="flex items-start gap-3">
//                       {/* ICON */}
//                       <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
//                         notification.source === 'admin' 
//                           ? 'bg-purple-100 text-purple-600'
//                           : notification.is_reaction
//                           ? 'bg-pink-100 text-pink-600'
//                           : 'bg-blue-100 text-blue-600'
//                       }`}>
//                         {notification.source === 'admin' ? (
//                           <span className="text-sm">👨‍💼</span>
//                         ) : notification.is_reaction ? (
//                           <span className="text-lg">{notification.reaction_emoji || "❤️"}</span>
//                         ) : (
//                           <span className="text-sm">💬</span>
//                         )}
//                       </div>
                      
//                       {/* CONTENT */}
//                       <div className="flex-1 min-w-0">
//                         <div className="flex justify-between">
//                           <h4 className="font-semibold text-gray-800 text-sm mb-1 truncate">
//                             {notification.source === 'admin' 
//                               ? "Admin Notification" 
//                               : notification.is_reaction 
//                               ? `${notification.sender_name || "Someone"} reacted`
//                               : notification.sender_name || "New Message"
//                             }
//                           </h4>
//                           <div className="flex items-center gap-2">
//                             {!notification.is_read && (
//                               <div className="w-2 h-2 bg-amber-500 rounded-full mt-1 animate-pulse"></div>
//                             )}
//                             {notification.source === 'admin' && (
//                               <span className="text-xs text-gray-400">👨‍💼</span>
//                             )}
//                           </div>
//                         </div>
                        
//                         <p className="text-gray-600 text-sm mb-2 line-clamp-2">
//                           {notification.message || notification.content || "No message"}
//                         </p>
                        
//                         {/* SENDER INFO */}
//                         <div className="flex items-center text-xs text-gray-500 mb-1">
//                           <span className="mr-1">
//                             {notification.source === 'admin' 
//                               ? "From:" 
//                               : notification.is_reaction 
//                               ? "Reaction by:" 
//                               : "From:"
//                             }
//                           </span>
//                           <span className={`font-medium ${
//                             notification.source === 'admin' 
//                               ? 'text-purple-600'
//                               : notification.is_reaction
//                               ? 'text-pink-600'
//                               : 'text-blue-600'
//                           }`}>
//                             {notification.sender_name || "User"}
//                           </span>
                          
//                           {/* Show ID for debugging */}
//                           {notification.sender_id && (
//                             <span className="ml-2 text-gray-400">
//                               (ID: {notification.sender_id})
//                             </span>
//                           )}
//                         </div>
                        
//                         {/* SOURCE AND TIME */}
//                         <div className="flex items-center justify-between mt-1">
//                           <span className={`text-xs px-2 py-0.5 rounded-full ${
//                             notification.source === 'admin' 
//                               ? 'bg-purple-100 text-purple-600' 
//                               : notification.is_reaction
//                               ? 'bg-pink-100 text-pink-600'
//                               : 'bg-blue-100 text-blue-600'
//                           }`}>
//                             {notification.source === 'admin' 
//                               ? 'Admin' 
//                               : notification.is_reaction 
//                               ? 'Reaction' 
//                               : 'Chat'
//                             }
//                           </span>
                          
//                           <p className="text-xs text-gray-400">
//                             {formatDate(notification.created_at)}
//                           </p>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* FOOTER */}
//           <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
//             <div className="flex justify-between items-center">
//               <button
//                 onClick={fetchNotifications}
//                 className="text-sm text-gray-600 hover:text-amber-600 font-medium py-1.5 px-3 hover:bg-gray-100 rounded-lg flex items-center gap-1"
//               >
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//                 </svg>
//                 Refresh
//               </button>

//               <button
//                 onClick={() => {
//                   navigate("/dashboard/messages");
//                   setShowDropdown(false);
//                 }}
//                 className="text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
//               >
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
//                 </svg>
//                 View Messages
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default NotificationBell;

 

 













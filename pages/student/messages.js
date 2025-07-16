import StudentLayout from "@/components/layout/StudentLayout";
import { useState } from "react";
import { Send, MessageSquare, ChevronLeft, CheckCircle } from "lucide-react";

const mockMessages = [
  {
    id: 1,
    name: "Mr. Daniel Okon",
    avatar: "/assets/img/profile.jpg",
    unread: 2,
    lastMessage: "Sure, let’s meet at 4pm.",
    messages: [
      {
        from: "tutor",
        text: "Hi! Are you ready for today’s session?",
        time: "2:00 PM",
      },
      {
        from: "student",
        text: "Yes, I am. Thanks!",
        time: "2:01 PM",
      },
      {
        from: "tutor",
        text: "Great! Let’s meet at 4pm.",
        time: "2:03 PM",
      },
    ],
  },
  {
    id: 2,
    name: "Miss Blessing Agbo",
    avatar: "/assets/img/profile.jpg",
    unread: 0,
    lastMessage: "Okay, I’ll send you the notes.",
    messages: [
      {
        from: "student",
        text: "Can you share the Biology notes?",
        time: "11:00 AM",
      },
      {
        from: "tutor",
        text: "Okay, I’ll send you the notes.",
        time: "11:02 AM",
      },
    ],
  },
];

export default function MessagesPage() {
  const [selectedChat, setSelectedChat] = useState(mockMessages[0]);
  const [messageText, setMessageText] = useState("");

  const handleSendMessage = () => {
    if (messageText.trim()) {
      const updatedChat = {
        ...selectedChat,
        messages: [
          ...selectedChat.messages,
          {
            from: "student",
            text: messageText,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ],
        lastMessage: messageText,
        unread: 0,
      };

      setSelectedChat(updatedChat);
      setMessageText("");
    }
  };

  return (
    <StudentLayout>
      <div className="row g-4">
        {/* Sidebar */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom">
              <h5 className="fw-semibold mb-0">
                <MessageSquare size={18} className="me-2" />
                Messages
              </h5>
            </div>
            <div className="list-group list-group-flush">
              {mockMessages.map((chat) => (
                <button
                  key={chat.id}
                  className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start ${
                    selectedChat.id === chat.id ? "active" : ""
                  }`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="d-flex align-items-start gap-3">
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="rounded-circle"
                      width={40}
                      height={40}
                    />
                    <div className="text-start">
                      <div className="fw-semibold">{chat.name}</div>
                      <small className="text-xs">{chat.lastMessage}</small>
                    </div>
                  </div>
                  {chat.unread > 0 && (
                    <span className="badge bg-primary rounded-pill">
                      {chat.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="col-md-8">
          <div className="card border-0 shadow-sm h-100 d-flex flex-column">
            <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <img
                  src={selectedChat.avatar}
                  alt={selectedChat.name}
                  className="rounded-circle"
                  width={40}
                  height={40}
                />
                <div>
                  <h6 className="mb-0 fw-semibold">{selectedChat.name}</h6>
                  <small className="text-muted">Online</small>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-grow-1 overflow-auto p-3"
              style={{ maxHeight: "400px" }}
            >
              {selectedChat.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`d-flex mb-3 ${
                    msg.from === "student" ? "justify-content-end" : ""
                  }`}
                >
                  <div
                    className={`p-2 rounded ${
                      msg.from === "student"
                        ? "bg-primary text-white"
                        : "bg-light"
                    }`}
                    style={{ maxWidth: "75%" }}
                  >
                    <div className="mb-1 small">{msg.text}</div>
                    <small className="text-gray-200">{msg.time}</small>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="card-footer bg-white border-top">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                />
                <button className="btn btn-primary" onClick={handleSendMessage}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

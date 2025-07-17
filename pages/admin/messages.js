import AdminLayout from "@/components/layout/AdminLayout";
import { useEffect, useState } from "react";
import { MessageSquare, Search, Send, User, Users, Flag } from "lucide-react";

const mockConversations = [
  {
    id: 1,
    name: "Ada Obi",
    type: "Student",
    preview: "Hello, I have a question about my session...",
    lastMessage: "2025-07-17T09:30:00Z",
    messages: [
      {
        sender: "Ada Obi",
        text: "Hello, I have a question about my session.",
        time: "9:30 AM",
      },
      { sender: "Admin", text: "Sure, how can I help?", time: "9:45 AM" },
    ],
  },
  {
    id: 2,
    name: "Mr. Emeka Jude",
    type: "Tutor",
    preview: "Can I get an update on my withdrawal?",
    lastMessage: "2025-07-16T14:15:00Z",
    messages: [
      {
        sender: "Mr. Emeka Jude",
        text: "Can I get an update on my withdrawal?",
        time: "2:15 PM",
      },
      {
        sender: "Admin",
        text: "It's currently being processed.",
        time: "2:30 PM",
      },
    ],
  },
];

export default function AdminMessagesPage() {
  const [search, setSearch] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [reply, setReply] = useState("");

  const filteredConversations = mockConversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = () => {
    if (!reply.trim()) return;
    const updated = { ...selectedChat };
    updated.messages.push({ sender: "Admin", text: reply, time: "Now" });
    const updatedList = mockConversations.map((c) =>
      c.id === updated.id ? updated : c
    );
    setSelectedChat(updated);
    setReply("");
  };

  return (
    <AdminLayout>
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Messages</h2>
        <p className="text-muted mb-0">
          View and respond to messages from students and tutors.
        </p>
      </div>

      <div className="row g-4">
        {/* Sidebar */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-bottom">
              <div className="input-group">
                <span className="input-group-text">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="card-body p-0">
              <ul className="list-group list-group-flush">
                {filteredConversations.length === 0 ? (
                  <li className="list-group-item text-muted text-center">
                    No conversations found.
                  </li>
                ) : (
                  filteredConversations.map((chat) => (
                    <li
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`list-group-item d-flex justify-content-between align-items-start cursor-pointer ${
                        selectedChat?.id === chat.id ? "bg-light" : ""
                      }`}
                      style={{ cursor: "pointer" }}
                    >
                      <div>
                        <div className="fw-semibold">{chat.name}</div>
                        <small className="text-muted">{chat.preview}</small>
                      </div>
                      <span className="badge bg-secondary-subtle text-secondary">
                        {chat.type === "Tutor" ? (
                          <Users size={16} />
                        ) : (
                          <User size={16} />
                        )}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Chat Pane */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center">
              <div className="fw-semibold">
                {selectedChat ? selectedChat.name : "Select a conversation"}
              </div>
              {selectedChat && (
                <button className="btn btn-sm btn-outline-danger">
                  <Flag size={16} className="me-1" />
                  Flag User
                </button>
              )}
            </div>
            <div
              className="card-body"
              style={{ height: "400px", overflowY: "auto" }}
            >
              {selectedChat ? (
                <div className="vstack gap-3">
                  {selectedChat.messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`d-flex ${
                        m.sender === "Admin"
                          ? "justify-content-end"
                          : "justify-content-start"
                      }`}
                    >
                      <div
                        className={`p-2 rounded ${
                          m.sender === "Admin"
                            ? "bg-primary text-white"
                            : "bg-light"
                        }`}
                        style={{ maxWidth: "70%" }}
                      >
                        <div className="small fw-medium">{m.sender}</div>
                        <div className="small">{m.text}</div>
                        <div className="small text-end">
                          {m.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className=" text-center mt-5">
                  Select a user to view messages.
                </p>
              )}
            </div>
            {selectedChat && (
              <div className="card-footer border-top">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="d-flex gap-2"
                >
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Type your reply..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <button className="btn btn-primary" type="submit">
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

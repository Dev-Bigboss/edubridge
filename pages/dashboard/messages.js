import { useState } from "react";
import TutorLayout from "@/components/layout/TutorLayout";
import { Mail, Send, Users, MessageCircle, Smile, Loader } from "lucide-react";

const mockConversations = [
  {
    id: 1,
    student: "Ada Obi",
    avatar: "/assets/img/profile.jpg",
    lastMessage: "Thank you so much!",
    timestamp: "10:30 AM",
    messages: [
      {
        from: "student",
        text: "Can we review yesterday’s topic?",
        time: "10:00 AM",
      },
      { from: "tutor", text: "Sure! Let’s do it.", time: "10:05 AM" },
      { from: "student", text: "Thank you so much!", time: "10:30 AM" },
    ],
  },
  {
    id: 2,
    student: "John Okafor",
    avatar: "/assets/img/profile.jpg",
    lastMessage: "Got it, thanks!",
    timestamp: "Yesterday",
    messages: [
      { from: "student", text: "I’ll join at 4 PM.", time: "9:00 AM" },
      { from: "tutor", text: "Perfect, see you then.", time: "9:05 AM" },
    ],
  },
];

export default function MessagesPage() {
  const [conversations] = useState(mockConversations);
  const [selectedId, setSelectedId] = useState(conversations[0]?.id || null);
  const [messageText, setMessageText] = useState("");

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    selectedConversation.messages.push({
      from: "tutor",
      text: messageText.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    setMessageText("");
  };

  return (
    <TutorLayout>
      <div
        className="d-flex flex-column flex-md-row border rounded overflow-hidden"
        style={{ height: "80vh" }}
      >
        {/* Left - Conversations */}
        <div
          className="border-end bg-white"
          style={{ width: "100%", maxWidth: "300px", overflowY: "auto" }}
        >
          <div className="border-bottom p-3">
            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
              <MessageCircle size={20} /> Messages
            </h5>
          </div>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`d-flex align-items-start gap-2 p-3 border-bottom cursor-pointer ${
                selectedId === conv.id ? "bg-light" : ""
              }`}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedId(conv.id)}
            >
              <img
                src={conv.avatar}
                alt={conv.student}
                width={40}
                height={40}
                className="rounded-circle object-fit-cover"
              />
              <div className="flex-grow-1">
                <div className="fw-semibold">{conv.student}</div>
                <small className="text-muted">{conv.lastMessage}</small>
              </div>
              <small className="text-muted">{conv.timestamp}</small>
            </div>
          ))}
        </div>

        {/* Right - Chat */}
        <div className="flex-grow-1 d-flex flex-column bg-light">
          {selectedConversation ? (
            <>
              <div className="p-3 border-bottom bg-white d-flex align-items-center gap-2">
                <img
                  src={selectedConversation.avatar}
                  alt={selectedConversation.student}
                  width={40}
                  height={40}
                  className="rounded-circle object-fit-cover"
                />
                <div>
                  <div className="fw-semibold">
                    {selectedConversation.student}
                  </div>
                  <small className="text-muted">Online</small>
                </div>
              </div>

              <div className="flex-grow-1 p-3 overflow-auto">
                {selectedConversation.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`d-flex ${
                      msg.from === "tutor"
                        ? "justify-content-end"
                        : "justify-content-start"
                    } mb-3`}
                  >
                    <div
                      className={`p-3 rounded ${
                        msg.from === "tutor"
                          ? "bg-primary text-white"
                          : "bg-white border"
                      }`}
                      style={{ maxWidth: "75%" }}
                    >
                      <div>{msg.text}</div>
                      <div className="text-end text-muted small mt-1">
                        {msg.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSend} className="border-top bg-white p-3">
                <div className="input-group">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    className="form-control"
                  />
                  <button type="submit" className="btn btn-primary">
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="d-flex justify-content-center align-items-center h-100 text-muted">
              <div className="text-center">
                <Mail size={48} className="mb-3" />
                <h6>Select a conversation to start messaging</h6>
              </div>
            </div>
          )}
        </div>
      </div>
    </TutorLayout>
  );
}

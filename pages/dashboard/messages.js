import TutorLayout from "@/components/layout/TutorLayout";
import { useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { useGetUserMessages } from "@/hooks/queries";
import { usePostMessage } from "@/hooks/mutations";

export default function MessagesPage() {
  const { data: chats = [], isLoading } = useGetUserMessages();
  const postMessage = usePostMessage();

  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState("");

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChat) return;

    postMessage.mutate({
      receiverId: selectedChat.id, // confirm if backend expects chat.id or userId
      text: messageText,
      conversationId: selectedChat.conversationId, // if your API supports this
    });

    setMessageText("");
  };

  return (
    <TutorLayout>
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
              {isLoading ? (
                <div className="p-3 text-muted">Loading...</div>
              ) : chats.length === 0 ? (
                <div className="p-3 text-muted">No conversations yet</div>
              ) : (
                chats?.map((chat) => (
                  <button
                    key={chat.id}
                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start ${
                      selectedChat?.id === chat.id ? "active" : ""
                    }`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <div className="d-flex align-items-start gap-3">
                      <img
                        src={chat.avatar || "/assets/img/profile.jpg"}
                        alt={chat.name}
                        className="rounded-circle"
                        width={40}
                        height={40}
                      />
                      <div className="text-start">
                        <div className="fw-semibold">{chat.name}</div>
                        <small className="text-xs text-muted">
                          {chat.lastMessage}
                        </small>
                      </div>
                    </div>
                    {chat.unread > 0 && (
                      <span className="badge bg-primary rounded-pill">
                        {chat.unread}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="col-md-8">
          <div className="card border-0 shadow-sm h-100 d-flex flex-column">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <img
                      src={selectedChat.avatar || "/assets/img/profile.jpg"}
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
                  {selectedChat.messages?.map((msg, i) => (
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
                        <small className="text-gray-500">{msg.time}</small>
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
                    <button
                      className="btn btn-primary"
                      onClick={handleSendMessage}
                      disabled={postMessage.isLoading}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="d-flex flex-grow-1 align-items-center justify-content-center text-muted">
                Select a conversation to start chatting
              </div>
            )}
          </div>
        </div>
      </div>
    </TutorLayout>
  );
}

import React, { useRef, useEffect, useState } from 'react';
import '../assets/ChatLog.css';

const ChatLog = ({ messages }) => {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="chat-log">
            {messages.map((message, index) => (
                <div key={index} className="message">
                    <div className="timestamp">{message.timestamp}</div>
                    <div>{message.text}</div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default ChatLog;

import React, { useRef, useEffect, useState } from 'react';
import './ChatLog.css';

const ChatLog = ({ messages }) => {
    const messagesEndRef = useRef(null);
    const [visible, setVisible] = useState(true);
    const [hovered, setHovered] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        setVisible(true);
        scrollToBottom();
        const timer = setTimeout(() => {
            if (!hovered) {
                setVisible(false);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [messages, hovered]);

    return (
        <div
            className={`chat-log ${visible || hovered ? 'visible' : 'hidden'}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
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

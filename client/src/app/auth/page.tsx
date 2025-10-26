"use client";
import React, { useState } from "react";
import "./login.css";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<boolean | null>(null);

  const validateEmail = (email: string) => {
    // Simple regex for email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setSuccess(null);

    // Check email format before sending request
    if (!validateEmail(email)) {
      setMessage("Invalid email format");
      setSuccess(false);
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      setMessage(data.message);
      setSuccess(data.success);

      if (data.success) {
        setEmail("");
        setPassword("");
      }
    } catch (error) {
      console.error(error);
      setMessage("Network error");
      setSuccess(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <form className="form" onSubmit={handleSubmit}>
          <label htmlFor="email" className="label">Email:</label>
          <input
            type="text"
            id="email"
            name="email"
            placeholder="you@example.com"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password" className="label">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="********"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="button">Login</button>
        </form>

        {/* Display message with conditional color */}
        {message && (
          <p
            className="message"
            style={{ color: success ? "green" : "red" }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginPage;

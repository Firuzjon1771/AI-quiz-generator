import React from "react";
import "../styles/Layout.css";

export default function Layout({ children }) {
  return (
    <>
      <header className="site-header">{children.navbar}</header>

      <main className="site-content">{children.content}</main>
    </>
  );
}

-- ============================================================
-- Filledears Database Schema
-- Run: mysql -u root -p < schema.sql
-- ============================================================

DROP DATABASE IF EXISTS filledears;
CREATE DATABASE filledears CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE filledears;

-- Users Table
CREATE TABLE users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    user_number     INT UNIQUE,
    last_visit_date DATE,
    streak          INT DEFAULT 1,
    news_read_count INT DEFAULT 0,
    profile_image   LONGTEXT,
    is_admin        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- News Table
CREATE TABLE news (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(500) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    content         TEXT NOT NULL,
    author_id       INT NOT NULL,
    image_base64    LONGTEXT,
    published_date  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Likes Table
CREATE TABLE likes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    news_id     INT NOT NULL,
    user_id     INT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (news_id, user_id),
    FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments Table
CREATE TABLE comments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    news_id     INT NOT NULL,
    user_id     INT NOT NULL,
    text        TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_comments_news ON comments(news_id);
CREATE INDEX idx_likes_news ON likes(news_id);

-- Seed Admin (password: admin123 — CHANGE IN PRODUCTION!)
-- This is bcrypt hash for 'admin123' with 10 rounds
INSERT INTO users (name, email, password_hash, user_number, is_admin)
VALUES ('Admin', 'th881384@gmail.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, TRUE);

INSERT INTO users (name, email, password_hash, user_number, is_admin)
VALUES ('Admin2', 'admin@filledears.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2, TRUE);
